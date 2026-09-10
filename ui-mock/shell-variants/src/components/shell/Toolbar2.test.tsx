/* Toolbar2 — spec 18 §4.1 shell toolbar: panel toggles (aria-pressed ↔
   store.panels wiring), center project identity, right-side inspector
   affordance. R19: the fullscreen toggle was REMOVED (th_mtoyu8bl, gap C38)
   and the mac traffic-light dots are gone (th_mtoyslr9) — pinned here so
   they can't creep back.
   R22 (DESIGN-R22 D5, issues #73/#80/#86/#87): the toggle home is
   restructured — LEFT: the page-aware asset toggle (Media Pool / Sound
   Library); RIGHT: the console toggles (Scopes + Nodes on color) + Mixer +
   Inspector. The Effects and Project buttons are REMOVED (pinned below).
   Store-wiring + a11y only — no layout assertions (jsdom has no geometry). */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { Toolbar2 } from './Toolbar2';
import { leftDockContent } from './leftDockContent';
import { renderPlain } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();

describe('Toolbar2 (spec 18 §4.1)', () => {
  it('renders one labeled toolbar landmark with the §10 testid', () => {
    const { getByRole, getByTestId } = renderPlain(<Toolbar2 />);
    // §4.1: the shell toolbar is a role=toolbar region, named for a11y
    expect(getByRole('toolbar', { name: 'Shell toolbar' })).toBeInTheDocument();
    expect(getByTestId('shell-toolbar')).toBeInTheDocument();
  });

  it('panel buttons mirror the booted panels state via aria-pressed', () => {
    // store boot: mediaPool+inspector open (§4.1 defaults); mixer collapsed.
    // R24-W1 (A3-R3): the Mixer toggle is AUDIO-ONLY — on the EDIT boot page
    // it is DOM-absent; its pressed state is pinned in the audio-page boots
    // below (the binary-toggle describe).
    const { getByRole, rerender } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('shell-toolbar-btn-mixer')).toBeNull();
    expect(getByRole('button', { name: 'Inspector' })).toHaveAttribute('aria-pressed', 'true');
    useUi.setState({ page: 'audio' });
    rerender(<Toolbar2 />);
    expect(getByRole('button', { name: 'Mixer' })).toHaveAttribute('aria-pressed', 'false'); // collapsed
    useUi.setState({ page: 'edit' });
  });

  it('clicking Media Pool toggles panels.mediaPool in the store and re-renders', () => {
    const { getByRole } = renderPlain(<Toolbar2 />);
    fireEvent.click(getByRole('button', { name: 'Media Pool' }));
    expect(S().panels.mediaPool).toBe(false);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(getByRole('button', { name: 'Media Pool' }));
    expect(S().panels.mediaPool).toBe(true);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Mixer and Inspector toggles are independent of each other (#73/#65: the mixer lives here now — audio page only)', () => {
    useUi.setState({ page: 'audio' });
    const { getByRole } = renderPlain(<Toolbar2 />);
    fireEvent.click(getByRole('button', { name: 'Mixer' }));
    fireEvent.click(getByRole('button', { name: 'Inspector' }));
    // §4.1: each toggle flips exactly its own bit — the mixer is BINARY now
    // (R24-W1): collapsed → the remembered visual ('full' by default)
    expect(S().mixerState).toBe('full');
    expect(S().panels.inspector).toBe(false);
    expect(getByRole('button', { name: 'Mixer' })).toHaveAttribute('aria-pressed', 'true');
    useUi.setState({ page: 'edit', mixerState: 'collapsed' });
  });

  it('reflects a pre-booted non-default panels state', () => {
    useUi.setState({ panels: { mediaPool: false, effects: true, inspector: true } });
    const { getByRole } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'false');
    expect(getByRole('button', { name: 'Inspector' })).toHaveAttribute('aria-pressed', 'true');
  });

  /* R22-D5 (#86/#87): the Effects and Project buttons are REMOVED — the
     console toggles own the slot; inspectorProjectMode stays store-only. */
  it('R22-D5: NO Effects and NO Project buttons (#86/#87)', () => {
    renderPlain(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-effects')).toBeNull();
    expect(screen.queryByTestId('shell-toolbar-btn-project')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Effects' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Project' })).toBeNull();
  });

  /* R23-FIX (review-sweep R-c, item 11 — RE-PINNED): the left toggle
     renders on the gatedByPool pages ONLY (edit + color). Audio + FX own
     the whole left slot unconditionally (the dock mounts regardless of the
     pool flag), so a toggle there would claim a toggle it cannot perform —
     DOM-absent, the lying-control #100 law. */
  it('R22-D5 (#80) → R23-FIX R-c → R24-W2 (A2-R5): the left toggle follows the page asset domain (Gallery on color — the stills panel RENAMED, Media Pool on edit; audio/fx own the slot — no toggle)', () => {
    useUi.setState({ page: 'audio' });
    const { getByRole, rerender } = renderPlain(<Toolbar2 />);
    // AUDIO owns the slot — the toggle is DOM-absent (the SoundLibrary IS the dock)
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sound Library' })).toBeNull();
    useUi.setState({ page: 'color' });
    rerender(<Toolbar2 />);
    expect(getByRole('button', { name: 'Gallery' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Media Pool' })).toBeNull();
    useUi.setState({ page: 'edit' });
    rerender(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gallery' })).toBeNull();
    useUi.setState({ page: 'fx' });
    rerender(<Toolbar2 />);
    // FX owns the slot too — no "Effects" toggle (the FxBrowser IS the dock)
    expect(screen.queryByRole('button', { name: 'Effects' })).toBeNull();
    useUi.setState({ page: 'edit' });
    rerender(<Toolbar2 />);
    expect(screen.getByRole('button', { name: 'Media Pool' })).toBeInTheDocument();
  });

  /* R22-D3 (#73) → R23-WB (D-B1): the console toggles — Scopes off↔open, Nodes
     (the viewer-region surface), both color-page-only. */
  it('R23-WB: the color-page console toggles (Scopes/Nodes) live here; absent on edit', () => {
    useUi.setState({ page: 'color', colorScopesState: 'off' });
    const { getByTestId, getByRole, rerender } = renderPlain(<Toolbar2 />);
    const scopes = getByTestId('shell-toolbar-btn-scopes');
    expect(scopes).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(scopes);
    expect(S().colorScopesState).toBe('open'); // the 4-state machine died — 'open' is the only visual (D-B1)
    expect(scopes).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(scopes);
    expect(S().colorScopesState).toBe('off');
    const nodes = getByTestId('shell-toolbar-btn-nodes');
    expect(nodes).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(nodes);
    expect(S().colorNodesDock).toBe(true);
    expect(getByRole('button', { name: 'Nodes' })).toHaveAttribute('aria-pressed', 'true');
    // on the EDIT page the color consoles are absent
    useUi.setState({ page: 'edit' });
    rerender(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-scopes')).toBeNull();
    expect(screen.queryByTestId('shell-toolbar-btn-nodes')).toBeNull();
    useUi.setState({ colorScopesState: 'off', colorNodesDock: false });
  });

  /* R23-WB (D-B5, #92) → R24-W1 (DESIGN-R24 §1.3 A3-R3; issues #65/#66 —
     supersedes R23-WB's edit+audio row): the Mixer toggle renders on the
     AUDIO page ONLY (DOM-absent on edit/color/fx/deliver). */
  it('R24-W1 (A3-R3/#65/#66): the Mixer toggle is AUDIO-only — DOM-absent on edit/color/fx/deliver', () => {
    const { rerender } = renderPlain(<Toolbar2 />);
    useUi.setState({ page: 'audio' });
    rerender(<Toolbar2 />);
    expect(screen.getByTestId('shell-toolbar-btn-mixer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mixer' })).toBeInTheDocument();
    for (const p of ['edit', 'color', 'fx', 'deliver'] as const) {
      useUi.setState({ page: p });
      rerender(<Toolbar2 />);
      expect(screen.queryByTestId('shell-toolbar-btn-mixer')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Mixer' })).toBeNull();
    }
    useUi.setState({ page: 'audio' });
    rerender(<Toolbar2 />);
    expect(screen.getByTestId('shell-toolbar-btn-mixer')).toBeInTheDocument();
    useUi.setState({ page: 'edit' });
  });

  /* R24-W1 (A3-R3; #65 "why mixer can turn on but cannot toggle off?" +
     #66): the toggle is BINARY with lastVisual memory — open/close/open
     round-trips, and a meters visual is remembered (the audio page's mode). */
  it('R24-W1: the Mixer toggle is a binary open/close with memory (collapsed ↔ full; meters remembered)', () => {
    useUi.setState({ page: 'audio' });
    const { getByRole } = renderPlain(<Toolbar2 />);
    const btn = getByRole('button', { name: 'Mixer' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('title', 'Show audio mixer'); // binary wording
    fireEvent.click(btn);
    expect(S().mixerState).toBe('full'); // the default memory
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('title', 'Hide audio mixer');
    fireEvent.click(btn);
    expect(S().mixerState).toBe('collapsed'); // TOGGLE OFF — #65's fix
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(S().mixerState).toBe('full'); // re-open returns to the memory
    // the dock header's mode action writes 'meters'; a close REMEMBERS it
    act(() => { S().setMixerState('meters'); });
    fireEvent.click(btn);
    expect(S().mixerState).toBe('collapsed');
    fireEvent.click(btn);
    expect(S().mixerState).toBe('meters');
    useUi.setState({ page: 'edit', mixerState: 'collapsed' });
  });

  /* R24-W1 (A3-R3): the glyph law — AudioLines when CLOSED (opening shows
     strips), SlidersVertical when OPEN; NEVER SlidersHorizontal on the Mixer
     button (F1's Inspector-collision glyph — the Inspector next door is the
     one control that legitimately carries it, which is exactly the point). */
  it('R24-W1: the Mixer glyph law — AudioLines closed / SlidersVertical open; never SlidersHorizontal (the Inspector collision)', () => {
    useUi.setState({ page: 'audio' });
    const { getByRole } = renderPlain(<Toolbar2 />);
    const mixerGlyph = () => screen.getByTestId('shell-toolbar-btn-mixer').querySelector('svg')!.getAttribute('class') ?? '';
    const inspectorGlyph = () => screen.getByTestId('shell-toolbar-btn-inspector').querySelector('svg')!.getAttribute('class') ?? '';
    expect(mixerGlyph()).toContain('lucide-audio-lines'); // closed → AudioLines
    expect(mixerGlyph()).not.toContain('lucide-sliders-horizontal');
    expect(inspectorGlyph()).toContain('lucide-sliders-horizontal'); // the collision twin next door
    fireEvent.click(getByRole('button', { name: 'Mixer' }));
    expect(mixerGlyph()).toContain('lucide-sliders-vertical'); // open → SlidersVertical
    expect(mixerGlyph()).not.toContain('lucide-sliders-horizontal');
    expect(mixerGlyph()).not.toContain('lucide-audio-lines');
    useUi.setState({ page: 'edit', mixerState: 'collapsed' });
  });

  it('shows the project title and status from the mock document (§4.1 center)', () => {
    const { getByText, getByTitle } = renderPlain(<Toolbar2 />);
    expect(getByText('Beach Doc — Rough Cut')).toBeInTheDocument();
    expect(getByText('Edited')).toBeInTheDocument();
    expect(getByTitle('Beach Doc — Rough Cut')).toBeInTheDocument(); // truncate fallback
  });

  /* th_mtoyu8bl (gap C38): honest REMOVAL — no fullscreen-viewer control at
     all (the v2 surface isn't built; the old button only ever toasted a
     deferral). */
  it('has NO fullscreen-viewer toggle (th_mtoyu8bl removal, gap C38)', () => {
    renderPlain(<Toolbar2 />);
    expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeNull();
    expect(screen.queryByTestId('shell-toolbar-btn-fullscreen')).toBeNull();
  });

  /* th_mtoyslr9: the mac traffic-light dots (3 aria-hidden colored circles)
     are removed entirely — no faux window chrome in a web-page mock. (The
     lucide svgs also carry aria-hidden, so the pin is the dot chrome itself:
     no rounded-full dot spans, none of the three hard-coded dot colors.) */
  it('has NO mac traffic-light dots (th_mtoyslr9 removal)', () => {
    const { container } = renderPlain(<Toolbar2 />);
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
    expect(container.querySelectorAll('[class*="bg-[#fd5f4d]"], [class*="bg-[#fdbb2e]"], [class*="bg-[#28c83f]"]')).toHaveLength(0);
  });
});

describe('Toolbar2 roving tabindex (spec 18 §11.1 P2, ARIA toolbar pattern)', () => {
  const btn = (name: string) => screen.getByRole('button', { name });

  it('Tab from outside lands on the FIRST button only — the rest are tabIndex −1', async () => {
    const user = userEvent.setup();
    useUi.setState({ page: 'edit' });
    renderPlain(
      <div>
        <button>before</button>
        <Toolbar2 />
      </div>,
    );
    await user.tab(); // "before"
    await user.tab(); // enters the toolbar — single tab stop
    expect(document.activeElement).toBe(btn('Media Pool'));
    // one tab stop: the other one is removed from the tab order (R24-W1:
    // edit = [Media Pool, Inspector] — the Mixer is audio-only now)
    expect(btn('Inspector')).toHaveAttribute('tabindex', '-1');
  });

  it('R24-W1: the AUDIO page — [Mixer, Inspector] is the cycle; the left toggle is DOM-absent', () => {
    useUi.setState({ page: 'audio' });
    renderPlain(<Toolbar2 />);
    const focus = (name: string) => act(() => { btn(name).focus(); });
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull(); // audio owns the slot
    focus('Mixer');
    fireEvent.keyDown(btn('Mixer'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Mixer')); // wraps over TWO buttons
    focus('Mixer');
    fireEvent.keyDown(btn('Mixer'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'Home' });
    expect(document.activeElement).toBe(btn('Mixer'));
    useUi.setState({ page: 'edit' });
  });

  it('ArrowRight/ArrowLeft move focus between buttons in DOM order (wrapping)', () => {
    useUi.setState({ page: 'edit' });
    renderPlain(<Toolbar2 />);
    const focus = (name: string) => act(() => { btn(name).focus(); });
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowRight' });
    // R24-W1: the Mixer is absent on edit — the next stop is Inspector
    expect(document.activeElement).toBe(btn('Inspector'));
    // ← walks back
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // wrap: ← from the first lands on the LAST (Inspector), → from the last
    // on the first (R24-W1: 2 buttons on edit — the mixer is audio-only)
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // the tab stop follows the rover, not the boot index
    expect(btn('Media Pool')).toHaveAttribute('tabindex', '0');
  });

  it('Home/End jump to the first/last button; Tab is left natural (exits)', async () => {
    const user = userEvent.setup();
    useUi.setState({ page: 'edit' });
    renderPlain(
      <div>
        <Toolbar2 />
        <button>after</button>
      </div>,
    );
    act(() => { btn('Media Pool').focus(); });
    fireEvent.keyDown(btn('Media Pool'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'Home' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // Tab is NOT intercepted — it leaves the toolbar for the next stop
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });

  it('R22 → R23-WB: on the color page the console toggles join the arrow cycle in DOM order (no mixer — D-B5)', () => {
    useUi.setState({ page: 'color' });
    renderPlain(<Toolbar2 />);
    const focus = (name: string) => act(() => { btn(name).focus(); });
    focus('Gallery');
    fireEvent.keyDown(btn('Gallery'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Scopes'));
    fireEvent.keyDown(btn('Scopes'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Nodes'));
    fireEvent.keyDown(btn('Nodes'), { key: 'ArrowRight' });
    // #92: the Mixer button is ABSENT on color — the next stop is Inspector.
    // (Regression: the rover indices must stay CONTIGUOUS — a hole where the
    // mixer's index would sit left focus stranded on Nodes here.)
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Gallery')); // wraps
    // End from the first = the last (Inspector)
    focus('Gallery');
    fireEvent.keyDown(btn('Gallery'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Inspector'));
    useUi.setState({ page: 'edit' });
  });

  it('R23-WB: a page flip that shrinks the button set never leaves the toolbar without a tab stop (clamped rover)', () => {
    useUi.setState({ page: 'color' });
    const { rerender } = renderPlain(<Toolbar2 />);
    // drive the rover to the LAST color button (Inspector, index 3)
    act(() => { btn('Gallery').focus(); });
    fireEvent.keyDown(btn('Gallery'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Inspector'));
    // flip to edit (2 buttons — R24-W1: the mixer is audio-only): the stale
    // rover would point past the set — the clamped stop keeps EXACTLY ONE
    // tab stop (the §11.1 law)
    useUi.setState({ page: 'edit' });
    rerender(<Toolbar2 />);
    expect(btn('Inspector')).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1);
    useUi.setState({ page: 'edit' });
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A1/D-D1): the FX page's toolbar face ---------- */

/* ---------- R23-WA → R23-FIX (review-sweep R-c, item 11 — RE-PINNED): the
   FX page's left dock is UNCONDITIONAL (gatedByPool: false) — the toggle
   that used to carry its "Effects" label is DOM-absent there (the
   FxBrowser IS the dock; a toggle would lie). The dock routing itself is
   pinned in LeftDock.test + AppShell.test. ---------- */

describe('R23-FIX R-c: the FX page owns the left slot — no toggle, dense rover', () => {
  it('the fx page renders NO left toggle (the slot is unconditional — the label tests moved to the dock suites)', () => {
    useUi.setState({ page: 'fx' });
    const { rerender } = renderPlain(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    for (const label of ['Effects', 'Media Pool', 'Sound Library', 'Stills']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
    useUi.setState({ page: 'edit' });
    rerender(<Toolbar2 />);
    expect(screen.getByRole('button', { name: 'Media Pool' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Effects' })).toBeNull(); // edit keeps the honest pool name
  });

  it('the fx-page rover stays dense — Inspector is the ONLY button and the single tab stop (like deliver)', () => {
    useUi.setState({ page: 'fx' });
    renderPlain(<Toolbar2 />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1); // Inspector alone — no hole where the toggle sat
    expect(buttons[0]).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[0]); // one-button wrap math
    useUi.setState({ page: 'edit' });
  });
});

/* ---------- R23-WD (DESIGN-R23 D-D1; #100/#106/#91 + ruling 16): the
   leftDockContent table drives the left toggle ---------- */

describe('R23-WD (D-D1): the leftDockContent table drives the left toggle', () => {
  /* R23-FIX R-c RE-PIN: the label law covers the GATED pages (edit + color)
     — the un-gated pages (audio/fx) own the slot, no toggle to label. */
  it('the label law on the gated pages — the toggle renders exactly the table label on edit/color; audio/fx render NO toggle', () => {
    const { rerender } = renderPlain(<Toolbar2 />);
    for (const p of ['edit', 'color'] as const) {
      act(() => { useUi.setState({ page: p }); });
      rerender(<Toolbar2 />);
      const c = leftDockContent(p)!;
      expect(screen.getByRole('button', { name: c.label })).toBeInTheDocument();
    }
    for (const p of ['audio', 'fx'] as const) {
      act(() => { useUi.setState({ page: p }); });
      rerender(<Toolbar2 />);
      expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    }
    act(() => { useUi.setState({ page: 'edit' }); });
  });

  it('the ICON follows the table on the gated pages (panel-left on edit, image on color)', () => {
    const { rerender } = renderPlain(<Toolbar2 />);
    const iconClass = () =>
      screen.getByTestId('shell-toolbar-btn-mediapool').querySelector('svg')!.getAttribute('class') ?? '';
    act(() => { useUi.setState({ page: 'color' }); });
    rerender(<Toolbar2 />);
    expect(iconClass()).toContain('lucide-image');
    act(() => { useUi.setState({ page: 'edit' }); });
    rerender(<Toolbar2 />);
    expect(iconClass()).toContain('lucide-panel-left');
    // the un-gated pages render no toggle at all (R-c) — no icon to follow
    act(() => { useUi.setState({ page: 'audio' }); });
    rerender(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    act(() => { useUi.setState({ page: 'fx' }); });
    rerender(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    act(() => { useUi.setState({ page: 'edit' }); });
  });

  it('DELIVER: the left toggle is DOM-ABSENT (ruling 16 — DeliverPage owns its own presets rail)', () => {
    act(() => { useUi.setState({ page: 'deliver' }); });
    renderPlain(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    for (const label of ['Media Pool', 'Stills', 'Sound Library', 'Effects']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
    // the toolbar itself survives — title center + Inspector right
    expect(screen.getByTestId('shell-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspector' })).toBeInTheDocument();
    act(() => { useUi.setState({ page: 'edit' }); });
  });

  it('DELIVER: the rover stays dense — Inspector is the ONLY button and the single tab stop', () => {
    act(() => { useUi.setState({ page: 'deliver' }); });
    renderPlain(<Toolbar2 />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1); // Inspector alone — no hole where the toggle sat
    expect(buttons[0]).toHaveAttribute('tabindex', '0');
    // the wrap math clamps on a one-button toolbar: arrows never strand focus
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[0]);
    act(() => { useUi.setState({ page: 'edit' }); });
  });

  it('deliver → edit: the toggle returns with its tab stop at index 0 (the table is read per render)', () => {
    act(() => { useUi.setState({ page: 'deliver' }); });
    const { rerender } = renderPlain(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
    act(() => { useUi.setState({ page: 'edit' }); });
    rerender(<Toolbar2 />);
    expect(screen.getByRole('button', { name: 'Media Pool' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Media Pool' })).toHaveAttribute('tabindex', '0');
  });
});

/* ---------- R24-W1 (#63 — "after so many times of mentioning this, we
   still call it Media Pool under color?"): the table-driven name law. The
   left-dock surface names come from leftDockContent — the ONE table both
   Toolbar2's toggle and the LeftDock read — so the class of "Media Pool
   under a non-edit page" can never return. "Pin both names": W2 renames
   the color stills panel to Gallery; at THIS wave the table's truth is
   'Stills' (the live-probe note in DESIGN-R24 §0) — W2's rename re-pins
   this row to 'Gallery'. ---------- */
describe('R24-W1 (#63): the left-dock naming law — no "Media Pool" off the edit page', () => {
  it('table-driven: every page ≠ edit names its left dock something OTHER than "Media Pool"', () => {
    for (const p of ['color', 'audio', 'fx'] as const) {
      const c = leftDockContent(p)!;
      expect(c.label).not.toBe('Media Pool'); // the #63 class dies here
    }
    expect(leftDockContent('deliver')).toBeNull(); // the hidden law (ruling 16)
    // the edit page KEEPS the pool name (it IS the media pool there)
    expect(leftDockContent('edit')!.label).toBe('Media Pool');
  });

  it('R24-W2 (A2-R5): the color left-dock label is "Gallery" — the rename landed (W1 pinned Stills as the then-truth)', () => {
    act(() => { useUi.setState({ page: 'color' }); });
    const { rerender } = renderPlain(<Toolbar2 />);
    expect(screen.getByRole('button', { name: 'Gallery' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Media Pool' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Stills' })).toBeNull(); // the R23 name is gone
    act(() => { useUi.setState({ page: 'edit' }); });
    rerender(<Toolbar2 />);
    expect(screen.getByRole('button', { name: 'Media Pool' })).toBeInTheDocument();
  });
});

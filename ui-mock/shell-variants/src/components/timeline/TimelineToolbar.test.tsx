/* TimelineToolbar component tests — tool radio cluster (spec 16 keys /
   18 §4.5), snap/link/lock-all toggles, marker + zoom clusters, the binary
   mixer toggle (R24-W1: audio-page-only, toggleMixerOpen with lastVisual
   memory), the master-audio cluster, the R23-WD (D-D2/#108) per-page
   cluster matrix — presence/absence pinned at DOM level (every hidden
   cluster is DOM-ABSENT, never display:none — the F6/rover dense laws) —
   and the R24-W1 ViewOptionsPopover (#64/#62: the density re-home, the
   clip-style radio pair, the waveforms converging flip — the APG menu
   grammar from the ContextMenu family). */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TimelineToolbar } from './TimelineToolbar';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

/* R24-W1: the popover reads the variant context — the toolbar needs the
   provider stack now (renderShell, not renderPlain). */
const boot = (patch: UiPatch = {}) => renderShell(<TimelineToolbar />, { patch });
const scene1 = () => store().scenes.find((s) => s.id === 'sc-1')!;
const track = (id: string) => scene1().tracks.find((t) => t.id === id)!;

/* opens the view-options popover — returns the menu element */
const openViewOptions = () => {
  fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
  return screen.getByTestId('shell-menu-tl-view-options');
};
const compactItem = () => screen.getByTestId('shell-menu-tl-view-options-compact');

describe('TimelineToolbar', () => {
  it('is a labelled toolbar with an 8-tool radio cluster (spec 18 §4.5 + R23-WA FX tool)', () => {
    boot({});
    expect(screen.getByRole('toolbar', { name: 'Timeline toolbar' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: 'Edit tool' });
    expect(within(group).getAllByRole('radio')).toHaveLength(8);
    expect(screen.getByTestId('shell-timeline-toolbar-tool-select')).toHaveAttribute('aria-checked', 'true');
  });

  /* R23-WA (DESIGN-R23 D-A1, Part IX ruling 2): the FX tool couples fxMode —
     the setTool single source. Selecting it flips the engine on; selecting
     any other tool flips it off; on the FX PAGE the page owns the flag. */
  it('R23-WA: the FX tool joins the radio — clicking it couples fxMode on, another tool off (ruling 2)', () => {
    boot({});
    const fxBtn = screen.getByTestId('shell-timeline-toolbar-tool-fx');
    fireEvent.click(fxBtn);
    expect(store().tool).toBe('fx');
    expect(store().fxMode).toBe(true);
    expect(fxBtn).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-tool-blade'));
    expect(store().fxMode).toBe(false);
    /* R23-WD (D-D2): on the FX PAGE the radio itself is DOM-ABSENT (the
       matrix gives the tools to Edit only) — the page owns fxMode, so tool
       writes can never kill it (ruling 2; the coupling pin goes store-level
       because the absent radio can no longer fire the click). */
    act(() => { useUi.setState({ page: 'fx', fxMode: true, tool: 'select' }); });
    expect(screen.queryByTestId('shell-timeline-toolbar-tool-blade')).toBeNull();
    act(() => { useUi.getState().setTool('blade'); });
    expect(store().fxMode).toBe(true);
    act(() => { useUi.setState({ page: 'edit', tool: 'select', fxMode: false }); });
  });

  /* R23-WB (D-B3/#94) → R24-W1 (A3-R4; issues #64/#62): the density law is
     RE-HOMED into the ViewOptionsPopover's "Compact tracks"
     menuitemcheckbox — the standalone toolbar button is RETIRED (pinned
     below: the testid is gone + zero SlidersHorizontal/Rows3 in the source).
     The checkbox state reads the ONE store resolver (honest — it reflects
     the timeline actually rendered); the click writes the per-session
     override, so 'auto' only survives until the user speaks. */
  it('R24-W1: the Compact-tracks checkbox is honest per page (auto: checked on color, unchecked on edit) and writes the override — menu STAYS OPEN across flips', () => {
    boot({ page: 'edit' });
    openViewOptions();
    expect(compactItem()).toHaveAttribute('role', 'menuitemcheckbox');
    expect(compactItem()).toHaveAttribute('aria-checked', 'false');
    expect(store().timelineCompact).toBe('auto');
    fireEvent.click(compactItem());
    expect(store().timelineCompact).toBe('on'); // the user's word overrides 'auto'
    expect(compactItem()).toHaveAttribute('aria-checked', 'true');
    // the checkbox KEEPS the menu open — flip/flip-back needs no reopen
    fireEvent.click(compactItem());
    expect(store().timelineCompact).toBe('off');
    expect(compactItem()).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(compactItem());
    expect(store().timelineCompact).toBe('on');
    useUi.setState({ page: 'edit', timelineCompact: 'auto' });
  });

  it('R24-W1: the color page auto-resolves compact — the checkbox boots checked and flips the strip ↔ full tracks', () => {
    boot({ page: 'color' });
    openViewOptions();
    expect(compactItem()).toHaveAttribute('aria-checked', 'true'); // auto → compact on color
    fireEvent.click(compactItem());
    expect(store().timelineCompact).toBe('off');
    expect(compactItem()).toHaveAttribute('aria-checked', 'false');
    useUi.setState({ page: 'edit', timelineCompact: 'auto' });
  });

  /* R23-FIX (review-sweep R-b, R3-P2#3 — RE-PINNED): the Compact-tracks
     item is DOM-ABSENT on fx (the FX page forces the full Timeline; a
     checkbox there would advertise a compact strip the page can never
     render). */
  it('R24-W1: the Compact-tracks item renders on edit/color/audio/deliver and is DOM-ABSENT on fx', () => {
    for (const p of ['edit', 'color', 'audio', 'deliver'] as const) {
      const { unmount } = boot({ page: p });
      openViewOptions();
      expect(compactItem()).toBeInTheDocument();
      fireEvent.keyDown(screen.getByTestId('shell-menu-tl-view-options'), { key: 'Escape' });
      unmount();
    }
    // fx: DOM-absent — the resolver returns false on fx, no control may claim otherwise
    const { unmount } = boot({ page: 'fx' });
    openViewOptions();
    expect(screen.queryByTestId('shell-menu-tl-view-options-compact')).toBeNull();
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Compact tracks' })).toBeNull();
    unmount();
    useUi.setState({ page: 'edit', timelineCompact: 'auto' });
  });

  /* R24-W1: the RETIREMENT pins — the standalone density button's testid +
     the collision glyph family are gone from the toolbar source (source-
     text level, the shortcutMap/appLayers precedent; built via concatenation
     so this file never matches its own needles). */
  it('R24-W1: the standalone density button is RETIRED — zero btn-density / Rows3 / SlidersHorizontal in TimelineToolbar.tsx', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/timeline/TimelineToolbar.tsx'), 'utf8');
    expect(src).not.toContain(['shell-timeline-toolbar', '-btn-density'].join(''));
    expect(src).not.toContain(['Rows', '3'].join(''));
    // this toolbar carries no Inspector — the SlidersHorizontal collision
    // glyph must be GONE entirely (the mixer toggle now uses SlidersVertical)
    expect(src).not.toContain(['Sliders', 'Horizontal'].join(''));
    expect(src).toContain('SlidersVertical');
  });

  it('clicking a tool switches the store tool and the radio state (spec 16 B/V keys)', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-tool-blade'));
    expect(store().tool).toBe('blade');
    expect(screen.getByTestId('shell-timeline-toolbar-tool-blade')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('shell-timeline-toolbar-tool-select')).toHaveAttribute('aria-checked', 'false');
  });

  it('snap / link toggles flip the store and their aria-pressed state (spec 18 §4.5)', () => {
    boot({});
    const snap = screen.getByTestId('shell-timeline-toolbar-btn-snap');
    expect(snap).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(snap);
    expect(store().snap).toBe(false);
    expect(snap).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle A/V link' }));
    expect(store().link).toBe(false);
  });

  it('lock-all fans out to every track via one undoable batch (spec 18 §4.5 lock-all)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Lock all tracks' }));
    expect(store().lockAll).toBe(true);
    for (const t of scene1().tracks) expect(t.locked).toBe(true);
    expect(store().past).toHaveLength(1);
  });

  it('the marker button adds a marker at the playhead (spec 16 M key)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Add marker' }));
    expect(scene1().markers).toHaveLength(6);
    expect(scene1().markers.at(-1)!.time).toBe(16);
  });

  it('zoom buttons step ×1.7 (canonical) and the slider maps exponentially vs the dynamic min (R15 T1)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(store().pxPerSec).toBeCloseTo(78.2, 0); // 46 × 1.7 (ZOOM_BUTTON_FACTOR)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(store().pxPerSec).toBeCloseTo(46, 0);
    // input[type=range] → implicit role=slider; disambiguates from the zoom-search button
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline zoom' }), { target: { value: '100' } });
    expect(store().pxPerSec).toBeCloseTo(5000, 0); // slider top = 100× zoom (canonical domain)
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline zoom' }), { target: { value: '0' } });
    // slider bottom = the DYNAMIC min (zoom-to-fit with 25% headroom, spec-05 §5.2)
    expect(store().pxPerSec).toBeCloseTo(store().zoomMinPps, 1);
  });

  it('R24-W1 (A3-R3/#65/#66): the mixer button is DOM-ABSENT on the EDIT page — the binary toggle lives on audio only', () => {
    boot({});
    expect(screen.queryByTestId('btn-mixer-state')).toBeNull(); // edit loses the cluster
    expect(screen.queryByRole('button', { name: /audio mixer/i })).toBeNull();
    useUi.setState({ page: 'edit' });
  });

  it('R24-W1 (A3-R3/#65/#66): on the AUDIO page the mixer button is the BINARY toggle (collapsed ↔ the remembered visual)', () => {
    boot({ page: 'audio' });
    const btn = screen.getByTestId('btn-mixer-state');
    expect(btn).toHaveAttribute('aria-pressed', 'false'); // collapsed
    expect(btn).toHaveAccessibleName('Show audio mixer'); // binary wording
    fireEvent.click(btn);
    expect(store().mixerState).toBe('full'); // the default lastVisual memory
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAccessibleName('Hide audio mixer');
    fireEvent.click(btn);
    expect(store().mixerState).toBe('collapsed'); // TOGGLE OFF — #65's fix
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(store().mixerState).toBe('full'); // re-open returns to the memory
    // the dock header's mode action writes 'meters'; a close REMEMBERS it
    act(() => { useUi.getState().setMixerState('meters'); });
    fireEvent.click(btn);
    expect(store().mixerState).toBe('collapsed');
    fireEvent.click(btn);
    expect(store().mixerState).toBe('meters');
    useUi.setState({ page: 'edit', mixerState: 'collapsed' });
  });

  it('R24-W1: the toolbar mixer glyph law — AudioLines closed / SlidersVertical open (never SlidersHorizontal)', () => {
    boot({ page: 'audio' });
    const icons = () => screen.getByTestId('btn-mixer-state').querySelector('svg')!.getAttribute('class') ?? '';
    expect(icons()).toContain('lucide-audio-lines'); // closed → AudioLines (opening shows strips)
    expect(icons()).not.toContain('lucide-sliders-horizontal');
    fireEvent.click(screen.getByTestId('btn-mixer-state'));
    expect(icons()).toContain('lucide-sliders-vertical'); // open → SlidersVertical
    expect(icons()).not.toContain('lucide-sliders-horizontal');
    expect(icons()).not.toContain('lucide-audio-lines');
    useUi.setState({ page: 'edit', mixerState: 'collapsed' });
  });

  it('master mute + volume drive the shared store values (spec 18 §4.5 master bus)', () => {
    boot({});
    const mute = screen.getByRole('button', { name: 'Mute master' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(store().masterMuted).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Master volume'), { target: { value: '50' } });
    expect(store().masterVolume).toBe(0.5);
  });

  it('the toolbar micro-meter is a silent (aria-hidden) StripMeter on master values (design doc §3.2)', () => {
    boot({});
    const meter = screen.getByTitle(/Master: /);
    expect(meter).toHaveAttribute('aria-hidden', 'true'); // never aria-live
    expect(meter.getAttribute('title')).toContain('Master: -8.5 dB'); // 0.78 × 66 − 60
  });

  it('the micro-meter rides the ONE master engine key and swaps 3px LEDs for 4 coarse chunks (R15-A2)', () => {
    boot({});
    const meter = screen.getByTitle(/Master: -8\.5 dB/);
    const l = meter.querySelector('[data-channel="l"]')!;
    expect(l.querySelector('.meter-segments')).toBeNull(); // no 3px LED lines at 14px
    expect(l.querySelector('.meter-segments-coarse')).not.toBeNull(); // 4 coarse chunks
    // same palette/engine as the strip meters: token gradient anchored to the
    // R20-W1 B9 taper positions (amber 37.2% = −18, red 69.2% = −6)
    expect((l.querySelector('div') as HTMLElement).style.background).toContain('var(--meter-green)');
    expect((l.querySelector('div') as HTMLElement).style.background).toContain('var(--meter-amber) 37.2%');
  });
});

/* R14 no-op sweep wiring — the marker-color dropdown (shared §4.9 palette),
   the zoom cluster (fit / selection / magnifier-focus), the DIM chip honesty
   contract, slider aria-valuetext, and the ⌘M tooltip. The view-options
   button's R14 dev-jargon toast is DEAD — the ViewOptionsPopover describe
   below owns its real grammar now. */
describe('TimelineToolbar R14 wiring', () => {
  it('the marker-color button opens the shared §4.9 palette; a pick adds a colored marker at the playhead', () => {
    boot({});
    const btn = screen.getByTestId('shell-timeline-toolbar-btn-marker-color');
    expect(btn).toHaveAttribute('aria-haspopup', 'menu');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(screen.getByTestId('shell-menu-tb-marker-color')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    // the SAME 8-dot row the ruler menu renders (markerColorItems builder)
    for (const c of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']) {
      expect(screen.getByTestId(`shell-menu-tb-marker-color-${c}`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByTestId('shell-menu-tb-marker-color-purple'));
    const added = scene1().markers.at(-1)!;
    expect(added.color).toBe('purple');
    expect(added.time).toBe(16); // at the playhead
    expect(screen.queryByTestId('shell-menu-tb-marker-color')).not.toBeInTheDocument(); // closed
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('zoom-to-fit solves px/s from the measured viewport (900 fallback) + scene duration', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-zoom-fit'));
    // sc-1 duration = 30 s → zoomFit(900, 30) = (900-24)/(30+2)
    expect(store().pxPerSec).toBeCloseTo((900 - 24) / 32, 5);
  });

  it('zoom-to-selection fits the selection span at ~80% of the viewport', () => {
    boot({}); // boot selection = ['el-2'] → span 8.5 s (8.5 → 17)
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-zoom-selection'));
    expect(store().pxPerSec).toBeCloseTo((900 * 0.8) / 8.5, 5);
  });

  it('zoom-to-selection with no selection explains itself with an info toast, zoom untouched', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-zoom-selection'));
    expect(store().pxPerSec).toBe(46);
    const t = store().toasts.at(-1)!;
    expect(t.kind).toBe('info');
    expect(t.title).toBe('Zoom to selection');
    expect(t.detail).toBe('No selection — select clips to zoom to their span');
  });

  it('the magnifier button focuses the zoom slider (distinct honest effect)', () => {
    boot({});
    const slider = screen.getByRole('slider', { name: 'Timeline zoom' });
    fireEvent.click(screen.getByRole('button', { name: 'Focus zoom slider' }));
    expect(slider).toHaveFocus();
  });

  it('the zoom + master sliders expose aria-valuetext (spec 18 §11.3 slider contract)', () => {
    boot({});
    expect(screen.getByRole('slider', { name: 'Timeline zoom' })).toHaveAttribute('aria-valuetext', '46 px/s');
    expect(screen.getByRole('slider', { name: 'Master volume' })).toHaveAttribute('aria-valuetext', '78%');
  });

  it('the DIM chip is aria-disabled with the M2 explanation tip (honesty contract)', () => {
    boot({});
    const dim = screen.getByText('DIM');
    expect(dim).toHaveAttribute('aria-disabled', 'true');
    expect(dim).toHaveAttribute('data-tip', 'Master dim is M2 (spec 20 §12) — display-only in the mock');
  });

  it('the ⌘M tooltip tells the focused-track truth (spec 16 §3.5)', () => {
    boot({});
    expect(screen.getByRole('button', { name: 'Mute master' })).toHaveAttribute(
      'data-tip',
      'Mute focused track (⌘M — master when nothing focused)',
    );
  });
});

describe('R14: tool radiogroup arrow-key navigation (spec 18 §11.1)', () => {
  it('ArrowRight moves the checked tool and roves focus; ArrowLeft wraps back', () => {
    renderShell(<TimelineToolbar />);
    const first = screen.getByTestId('shell-timeline-toolbar-tool-select');
    first.focus();
    fireEvent.keyDown(first.parentElement!, { key: 'ArrowRight' });
    expect(useUi.getState().tool).toBe('blade'); // select → blade
    expect(document.activeElement).toBe(screen.getByTestId('shell-timeline-toolbar-tool-blade'));
    fireEvent.keyDown(document.activeElement!.parentElement!, { key: 'ArrowLeft' });
    expect(useUi.getState().tool).toBe('select');
    expect(document.activeElement).toBe(first);
  });
});

/* ---------- R24-W1 (DESIGN-R24 §1.3 A3-R4; issues #64 + #62): the
   ViewOptionsPopover — a ContextMenu-family APG menu. Its items are pinned
   here (density re-home, clip-style radio pair, waveforms converging flip);
   the keyboard grammar follows the house §4.9 law. ---------- */
describe('R24-W1 (A3-R4/#64): the ViewOptionsPopover — APG menu grammar', () => {
  const opener = () => screen.getByTestId('shell-timeline-toolbar-btn-view-options');
  const menu = () => screen.getByTestId('shell-menu-tl-view-options');

  it('the opener is an aria-haspopup=menu button; a click opens the real APG menu (the R14 dev-jargon toast is DEAD)', () => {
    boot({ page: 'edit' });
    expect(opener()).toHaveAttribute('aria-haspopup', 'menu');
    expect(opener()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(opener());
    expect(menu()).toHaveAttribute('role', 'menu');
    expect(menu()).toHaveAccessibleName('Timeline view options');
    expect(opener()).toHaveAttribute('aria-expanded', 'true');
    // NO toast — the popover IS the surface now
    expect(store().toasts).toHaveLength(0);
    // the items are menuitem-family roles, in DOM order
    expect(compactItem()).toHaveAttribute('role', 'menuitemcheckbox');
    expect(screen.getByTestId('shell-menu-tl-view-options-clip-filmstrip')).toHaveAttribute('role', 'menuitemradio');
    expect(screen.getByTestId('shell-menu-tl-view-options-clip-blocks')).toHaveAttribute('role', 'menuitemradio');
    expect(screen.getByTestId('shell-menu-tl-view-options-waveforms')).toHaveAttribute('role', 'menuitemcheckbox');
  });

  it('Shift+F10 and ArrowDown both open; the FIRST ENABLED item takes focus', () => {
    boot({ page: 'edit' });
    opener().focus();
    fireEvent.keyDown(opener(), { key: 'F10', shiftKey: true });
    expect(menu()).toBeInTheDocument();
    expect(compactItem()).toHaveFocus(); // first item, enabled
    fireEvent.keyDown(menu(), { key: 'Escape' });
    // ArrowDown opens as well (the APG menu-button route)
    fireEvent.keyDown(opener(), { key: 'ArrowDown' });
    expect(menu()).toBeInTheDocument();
    expect(compactItem()).toHaveFocus();
  });

  it('Escape closes with focus returning to the opener; the outside click closes too', () => {
    boot({ page: 'edit' });
    fireEvent.click(opener());
    fireEvent.keyDown(menu(), { key: 'Escape' });
    expect(screen.queryByTestId('shell-menu-tl-view-options')).toBeNull();
    expect(opener()).toHaveFocus(); // §4.9: focus returns to the opener
    // outside click on the transparent overlay
    fireEvent.click(opener());
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.pointerDown(overlay);
    expect(screen.queryByTestId('shell-menu-tl-view-options')).toBeNull();
  });

  it('Tab dismisses (menus are not tab stops) — and Enter activates the focused item natively', () => {
    boot({ page: 'edit' });
    fireEvent.click(opener());
    fireEvent.keyDown(menu(), { key: 'Tab' });
    expect(screen.queryByTestId('shell-menu-tl-view-options')).toBeNull();
    expect(opener()).toHaveFocus();
    // Enter on the focused (compact) item activates it natively — buttons
    // activate on Enter/Space; the menu does not intercept those keys
    fireEvent.click(opener());
    fireEvent.keyDown(compactItem(), { key: 'Enter' });
    expect(store().timelineCompact).toBe('on');
    useUi.setState({ page: 'edit', timelineCompact: 'auto' });
  });

  it('↑/↓ rove with wrap and SKIP aria-disabled items (compact disables waveforms)', () => {
    boot({ page: 'edit', timelineCompact: 'on' }); // compact → waveforms disabled
    fireEvent.click(opener());
    const wave = screen.getByTestId('shell-menu-tl-view-options-waveforms');
    expect(wave).toHaveAttribute('aria-disabled', 'true'); // honest disabled
    expect(wave).toHaveAttribute('data-tip', 'Not available while tracks are compact');
    // rove: compact → filmstrip → block → (waveforms SKIPPED) → wraps to compact
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    expect(screen.getByTestId('shell-menu-tl-view-options-clip-filmstrip')).toHaveFocus();
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    expect(screen.getByTestId('shell-menu-tl-view-options-clip-blocks')).toHaveFocus();
    fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // skips the disabled waveforms, wraps
    expect(compactItem()).toHaveFocus();
    fireEvent.keyDown(menu(), { key: 'ArrowUp' }); // ← wraps back, skipping waveforms
    expect(screen.getByTestId('shell-menu-tl-view-options-clip-blocks')).toHaveFocus();
    // a disabled item is inert — no store write on click
    fireEvent.click(wave);
    expect(store().past).toHaveLength(0);
    expect(track('tr-audio-1').waveform).toBeUndefined(); // untouched
    useUi.setState({ page: 'edit', timelineCompact: 'auto' });
  });
});

describe('R24-W1 (A3-R4/#62): the ViewOptionsPopover items — clip style + waveforms', () => {
  it('Clip style: a menuitemradio pair riding the VARIANT context — ONE source with the debug overlay (aria-checked follows clipStyle)', () => {
    boot({ page: 'edit' });
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    const filmstrip = screen.getByTestId('shell-menu-tl-view-options-clip-filmstrip');
    const block = screen.getByTestId('shell-menu-tl-view-options-clip-blocks');
    expect(filmstrip).toHaveAttribute('aria-checked', 'true'); // the variant default
    expect(block).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(block);
    expect(block).toHaveAttribute('aria-checked', 'true');
    expect(filmstrip).toHaveAttribute('aria-checked', 'false');
    // the pair rides the VariantProvider's context — the same writer the
    // debug overlay uses, so the shell root's data-clipstyle follows
    expect(document.querySelector('[data-clipstyle]')!.getAttribute('data-clipstyle')).toBe('blocks');
    // the radio is a setting: the menu STAYS OPEN
    expect(screen.getByTestId('shell-menu-tl-view-options')).toBeInTheDocument();
    fireEvent.click(filmstrip);
    expect(filmstrip).toHaveAttribute('aria-checked', 'true');
    // containment: the provider persists to localStorage + the hash — scrub
    // both so no later render in this file boots with a leaked variant
    window.localStorage.removeItem('nle-shell-variants:v1');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  });

  it('Audio waveforms: the §4.7 convergence — all-on boots, ONE batch write converges every flag, a mixed state converges to true, a converged click mints nothing', () => {
    boot({ page: 'edit' });
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    const wave = screen.getByTestId('shell-menu-tl-view-options-waveforms');
    expect(wave).toHaveAttribute('aria-checked', 'true'); // undefined boots as ON (the §4.7 fixture quirk)
    expect(wave).not.toHaveAttribute('aria-disabled'); // edit auto = full tracks → enabled
    fireEvent.click(wave);
    expect(track('tr-audio-1').waveform).toBe(false); // converged
    expect(track('tr-audio-2').waveform).toBe(false);
    expect(wave).toHaveAttribute('aria-checked', 'false');
    // R24-W5d (W1's debt paid): the convergence is ONE withHistory batch
    // write (setAllTrackWaveforms) — the old per-track flip walk minted 4
    // entries (2 per undefined track on the undefined→true→false double
    // walk); undo now fully reverts in ONE step. (The checkbox's target is
    // always !waveformsOn — a real change by construction, so the popover
    // itself can never hit the batch's converged no-op arm; THAT arm is
    // pinned at the store level in useUiStore.test.ts.)
    expect(store().past).toHaveLength(1);
    // mixed state: A2 back on, A1 off → checked=false → one click converges ALL to true
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-audio-2', 'waveform'); });
    fireEvent.click(wave);
    expect(track('tr-audio-1').waveform).toBe(true);
    expect(track('tr-audio-2').waveform).toBe(true);
    expect(wave).toHaveAttribute('aria-checked', 'true');
    expect(store().past).toHaveLength(3); // batch + the manual A2 flip + the re-converge batch — still ONE per convergence
    // a FRESH track (A3) boots with addTrack's OWN law: explicit
    // waveform=true (the undefined state is a FIXTURE-only quirk — the
    // §4.7 fixture tracks boot undefined; addTrack never does). With all
    // three explicit-true, the checkbox reads checked and one click
    // converges every flag to false — A3 flips once like any explicit
    // track (no 2-step undefined walk)
    act(() => { useUi.getState().addTrack('audio'); });
    // re-find after every write: withHistory clones the scenes graph, so a
    // captured track object reference would go stale (the clone-on-write law)
    const a3 = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.badge === 'A3')!;
    expect(a3().waveform).toBe(true); // the addTrack seed
    expect(wave).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(wave); // converge all OFF
    expect(a3().waveform).toBe(false);
    expect(track('tr-audio-1').waveform).toBe(false);
    expect(track('tr-audio-2').waveform).toBe(false);
    expect(wave).toHaveAttribute('aria-checked', 'false');
  });
});

/* R23-WD (DESIGN-R23 D-D2, issue #108 + Part IX ruling 15) → R24-W1
   (DESIGN-R24 §1.3 A3-R3/R4): the PER-PAGE cluster matrix, pinned at DOM
   level. Every hidden cluster is DOM-ABSENT (queryByTestId/queryByRole →
   null — never display:none, so the F6/rover dense laws hold). Matrix:
   Edit = full; Color = zoom; Audio = snap + zoom + mixer + master;
   FX = zoom (the Compact-tracks ITEM is DOM-absent — the page forces the
   full Timeline); Deliver = zoom (read-mostly). The view-options opener
   is a pre-matrix house button on EVERY page (pinned separately below);
   the density cluster died with the standalone button (A3-R4). */
describe('R23-WD (D-D2/#108): the per-page TimelineToolbar cluster matrix', () => {
  /** every cluster's DOM probes — null probe = the cluster is DOM-absent */
  const probes = {
    tools: () => screen.queryByRole('radiogroup', { name: 'Edit tool' }),
    snap: () => screen.queryByTestId('shell-timeline-toolbar-btn-snap'),
    link: () => screen.queryByRole('button', { name: 'Toggle A/V link' }),
    lock: () => screen.queryByRole('button', { name: 'Lock all tracks' }),
    markers: () => screen.queryByRole('button', { name: 'Add marker' }),
    markerColor: () => screen.queryByTestId('shell-timeline-toolbar-btn-marker-color'),
    viewOptions: () => screen.getByTestId('shell-timeline-toolbar-btn-view-options'),
    zoom: () => screen.getByRole('slider', { name: 'Timeline zoom' }),
    zoomFit: () => screen.getByTestId('shell-timeline-toolbar-btn-zoom-fit'),
    mixer: () => screen.queryByTestId('btn-mixer-state'),
    master: () => screen.queryByRole('button', { name: 'Mute master' }),
    masterVolume: () => screen.queryByRole('slider', { name: 'Master volume' }),
    masterMeter: () => screen.queryByTitle(/Master: /),
    dim: () => screen.queryByText('DIM'),
  };
  /** count the cluster separators — the vsep law (a separator renders only
   *  between two PRESENT clusters; an absent cluster never dangles a bar) */
  const vseps = (c: HTMLElement) => c.querySelectorAll('.vsep').length;

  it('EDIT = full: tools radio + snap/link/lock + markers + zoom + master — the mixer button is AUDIO-ONLY now (A3-R3)', () => {
    const { container } = boot({ page: 'edit' });
    expect(within(probes.tools()!).getAllByRole('radio')).toHaveLength(8); // the 8-tool radio is untouched
    expect(probes.snap()).toBeInTheDocument();
    expect(probes.link()).toBeInTheDocument();
    expect(probes.lock()).toBeInTheDocument();
    expect(probes.markers()).toBeInTheDocument();
    expect(probes.markerColor()).toBeInTheDocument();
    expect(probes.viewOptions()).toBeInTheDocument(); // the pre-matrix house button
    expect(probes.zoom()).toBeInTheDocument();
    expect(probes.zoomFit()).toBeInTheDocument();
    expect(probes.mixer()).toBeNull(); // R24-W1: audio only (the master row keeps its edit+audio law)
    expect(probes.master()).toBeInTheDocument();
    expect(probes.masterVolume()).toBeInTheDocument();
    expect(probes.masterMeter()).toBeInTheDocument();
    expect(probes.dim()).toBeInTheDocument();
    expect(vseps(container)).toBe(4); // tools|snap, snap|markers, markers|zoom, zoom|master (mixer absent)
  });

  it('COLOR = zoom ONLY — no tools, no snap, no markers, no mixer, no master (ruling 15; the density cluster died with the standalone button)', () => {
    const { container } = boot({ page: 'color' });
    expect(probes.tools()).toBeNull();
    expect(probes.snap()).toBeNull();
    expect(probes.link()).toBeNull();
    expect(probes.lock()).toBeNull();
    expect(probes.markers()).toBeNull();
    expect(probes.markerColor()).toBeNull();
    expect(probes.mixer()).toBeNull();
    expect(probes.master()).toBeNull();
    expect(probes.masterVolume()).toBeNull();
    expect(probes.masterMeter()).toBeNull();
    expect(probes.dim()).toBeNull();
    // zoom + the pre-matrix view-options opener survive (the every-page law)
    expect(probes.viewOptions()).toBeInTheDocument();
    expect(probes.zoom()).toBeInTheDocument();
    expect(probes.zoomFit()).toBeInTheDocument();
    expect(vseps(container)).toBe(0); // zoom alone — no separators to draw
  });

  it('AUDIO = snap + zoom + mixer + master — NO tools radio, NO link/lock, NO markers', () => {
    const { container } = boot({ page: 'audio' });
    expect(probes.snap()).toBeInTheDocument();
    expect(probes.viewOptions()).toBeInTheDocument();
    expect(probes.zoom()).toBeInTheDocument();
    expect(probes.mixer()).toBeInTheDocument();
    expect(probes.master()).toBeInTheDocument();
    expect(probes.masterVolume()).toBeInTheDocument();
    expect(probes.dim()).toBeInTheDocument();
    expect(probes.tools()).toBeNull();
    expect(probes.link()).toBeNull();
    expect(probes.lock()).toBeNull();
    expect(probes.markers()).toBeNull();
    expect(probes.markerColor()).toBeNull();
    expect(vseps(container)).toBe(3); // snap|zoom, zoom|mixer, mixer|master
  });

  it('FX = zoom ONLY (the Compact-tracks ITEM is DOM-absent in the popover — the page forces the full Timeline) — no mixer, no master (ruling 15)', () => {
    const { container } = boot({ page: 'fx' });
    expect(screen.queryByTestId('shell-timeline-toolbar-btn-density')).toBeNull(); // the retired button stays dead
    expect(screen.queryByRole('button', { name: 'Toggle compact timeline' })).toBeNull();
    expect(probes.viewOptions()).toBeInTheDocument(); // the opener stays (clip-style + waveforms live)
    expect(probes.zoom()).toBeInTheDocument();
    expect(probes.mixer()).toBeNull();
    expect(probes.master()).toBeNull();
    expect(probes.masterMeter()).toBeNull();
    expect(probes.dim()).toBeNull();
    expect(probes.tools()).toBeNull();
    expect(probes.snap()).toBeNull();
    expect(probes.markers()).toBeNull();
    expect(vseps(container)).toBe(0);
  });

  it('DELIVER = zoom (read-mostly) — and "read-mostly" is NOT disabled: zoom still works (the timeline is live)', () => {
    const { container } = boot({ page: 'deliver' });
    expect(probes.viewOptions()).toBeInTheDocument();
    expect(probes.zoom()).toBeInTheDocument();
    expect(probes.zoomFit()).toBeInTheDocument();
    expect(probes.tools()).toBeNull();
    expect(probes.snap()).toBeNull();
    expect(probes.markers()).toBeNull();
    expect(probes.mixer()).toBeNull();
    expect(probes.master()).toBeNull();
    expect(vseps(container)).toBe(0);
    // the deliver timeline renders the loop in/out export range — zoom in
    // still steps ×1.7 through the zoom bus (live, not read-only)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(store().pxPerSec).toBeCloseTo(78.2, 0);
    useUi.setState({ page: 'edit', pxPerSec: 46 });
  });

  it('the pre-matrix view-options house button stays on every page (it is not a D-D2 cluster)', () => {
    for (const p of ['edit', 'color', 'audio', 'fx', 'deliver'] as const) {
      const { unmount } = boot({ page: p });
      expect(screen.getByTestId('shell-timeline-toolbar-btn-view-options')).toBeInTheDocument();
      unmount();
    }
    useUi.setState({ page: 'edit' });
  });
});

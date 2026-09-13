/* ViewOptionsPopover — R25-W6 (DESIGN-R25 §1 R3+R5 / §3 W6-A+W6-C; threads
   th_mtzp94ms "the timeline style mode should be remembered on per view mode
   basis when switch they should restore" + th_mtzors21 "compact - video,
   compact - audio, compact - all"): the PER-PAGE memory round-trips, pinned
   at the popover surface — the menu reads/writes the ACTIVE page's entry in
   the store's pageTimelineView map; switching pages (the store's setPage,
   fired live under the open menu) must flip every radio to the TARGET
   page's own entry, and switching back must RESTORE the source page's
   memory — the reviewer's exact ask. The APG menu grammar + the item pins
   live in TimelineToolbar.test (the popover's mount home); this file owns
   the W6 memory law alone. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { ViewOptionsPopover } from './ViewOptionsPopover';
import { renderShell, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const boot = () => renderShell(<ViewOptionsPopover showCompact />);
const openMenu = () => {
  fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
  return screen.getByTestId('shell-menu-tl-view-options');
};
const compactRadio = (id: 'off' | 'video' | 'audio' | 'all') =>
  screen.getByTestId(`shell-menu-tl-view-options-compact-${id}`);
const clipRadio = (id: 'filmstrip' | 'blocks') =>
  screen.getByTestId(`shell-menu-tl-view-options-clip-${id}`);
const waveCheckbox = () => screen.getByTestId('shell-menu-tl-view-options-waveforms');
/** the page switch fired LIVE under the open menu (the settings-menu
 *  stays-open law — no reopen needed for the restore to show) */
const goTo = (page: 'edit' | 'color' | 'audio' | 'fx' | 'deliver') => {
  act(() => { useUi.getState().setPage(page); });
};

describe('R25-W6-A (th_mtzp94ms): the per-page timeline view memory — the popover round-trips', () => {
  it('COMPACT: "All" on Edit → Color shows its OWN default (not compact) → back to Edit the strip choice is RESTORED', () => {
    boot();
    openMenu();
    expect(compactRadio('off')).toHaveAttribute('aria-checked', 'true'); // edit's default
    fireEvent.click(compactRadio('all'));
    expect(store().pageTimelineView.edit.compact).toBe('all');
    expect(compactRadio('all')).toHaveAttribute('aria-checked', 'true');
    // edit → color: the radios flip to COLOR's own entry (its default — off)
    goTo('color');
    expect(compactRadio('off')).toHaveAttribute('aria-checked', 'true');
    expect(compactRadio('all')).toHaveAttribute('aria-checked', 'false');
    expect(store().pageTimelineView.edit.compact).toBe('all'); // edit's memory untouched
    expect(store().pageTimelineView.color.compact).toBe('off');
    // color → edit: RESTORED — no restore action, the selector keys by page
    goTo('edit');
    expect(compactRadio('all')).toHaveAttribute('aria-checked', 'true');
    expect(store().pageTimelineView.edit.compact).toBe('all');
    // view state the whole way — not one history entry
    expect(store().past).toHaveLength(0);
  });

  it('CLIP STYLE: blocks on Edit → Color shows the variant default (filmstrip) → back to Edit blocks is RESTORED (the variant never moves)', () => {
    boot();
    openMenu();
    expect(clipRadio('filmstrip')).toHaveAttribute('aria-checked', 'true'); // null entry → the variant
    fireEvent.click(clipRadio('blocks'));
    expect(store().pageTimelineView.edit.clipStyle).toBe('blocks');
    // the VARIANT is the global default — the page write never touches it
    expect(document.querySelector('[data-clipstyle]')!.getAttribute('data-clipstyle')).toBe('filmstrip');
    goTo('color');
    expect(clipRadio('filmstrip')).toHaveAttribute('aria-checked', 'true'); // color's null entry → the variant
    expect(store().pageTimelineView.edit.clipStyle).toBe('blocks'); // edit's memory untouched
    goTo('edit');
    expect(clipRadio('blocks')).toHaveAttribute('aria-checked', 'true'); // RESTORED
    expect(store().pageTimelineView.edit.clipStyle).toBe('blocks');
  });

  it('WAVEFORMS: off on Edit → Color renders its own default (checked) → back to Edit off is RESTORED — the doc flags never move (zero history)', () => {
    boot();
    openMenu();
    expect(waveCheckbox()).toHaveAttribute('aria-checked', 'true'); // gate on + flags on
    fireEvent.click(waveCheckbox()); // OFF = the gate alone
    expect(store().pageTimelineView.edit.waveforms).toBe(false);
    expect(waveCheckbox()).toHaveAttribute('aria-checked', 'false');
    goTo('color');
    // color's own gate is on — the checkbox honestly reads the rendered
    // convergence there (gate AND flags), and the doc flags were NEVER
    // converged to false (the isolation law)
    expect(waveCheckbox()).toHaveAttribute('aria-checked', 'true');
    expect(store().pageTimelineView.color.waveforms).toBe(true);
    expect(store().pageTimelineView.edit.waveforms).toBe(false); // edit's memory untouched
    for (const track of store().scenes.find((s) => s.id === 'sc-1')!.tracks) {
      if (track.kind === 'audio') expect(track.waveform).toBeUndefined(); // the fixture's undefined = ON
    }
    goTo('edit');
    expect(waveCheckbox()).toHaveAttribute('aria-checked', 'false'); // RESTORED
    // the ENTIRE round-trip minted ZERO history entries (view state only)
    expect(store().past).toHaveLength(0);
  });

  it('the AUDIO page default is compact-VIDEO (th_mtzors21): the radio reads "Video" and the write still lands in the audio entry', () => {
    boot();
    openMenu();
    goTo('audio');
    expect(compactRadio('video')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(compactRadio('off'));
    expect(store().pageTimelineView.audio.compact).toBe('off');
    // the audio page's waveforms option stays ENABLED (audio lanes full)
    expect(waveCheckbox()).not.toHaveAttribute('aria-disabled');
    goTo('edit');
  });
});

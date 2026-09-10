/* ViewOptionsPopover — R24-W1 (DESIGN-R24 §1.3 A3-R4; issues #64 + #62): the
   timeline view-options hamburger is a REAL APG menu now, not the R14-era
   "popover not specced — density/clip-style live in the debug overlay"
   dev-jargon toast (#64: "why i can't toggle timeline view back to normal in
   color coding?" — the density override IS reachable from the shell at last).

   ContextMenu-FAMILY chrome (the house §4.9 menu grammar — same menu-pop /
   menu-item / menu-sep classes, same keyboard law, same transparent-overlay
   dismissal), but its own component: ContextMenu closes on every activation,
   while a view-options menu KEEPS OPEN across flips (checkbox + radio items
   are settings, not commands — flip/flip-back needs no reopen).

   Keyboard (APG menu-button + menu, the CheatSheet/ContextMenu house
   grammar): aria-haspopup="menu"; click / Shift+F10 (isMenuKey) / ArrowDown
   open; the FIRST ENABLED item takes focus on open; ↑/↓ rove with wrap,
   skipping aria-disabled items; Enter/Space activate natively (buttons);
   Escape / Tab / outside-click close with focus returning to the opener.

   Items (A3-R4):
   - "Compact tracks" — menuitemcheckbox = the D-B3 density resolver +
     the per-session override write (the retired standalone density
     button's exact write path). DOM-ABSENT on the FX page (the matrix
     flag — fx forces the full Timeline; the resolver ignores the
     override there, so no control may claim it).
   - "Clip style: Filmstrip | Block" — a menuitemradio pair riding the
     CLIP_STYLE variant context (ONE source of truth with the debug
     overlay — setVariant is the shared writer; TrackHeader/Clip lane
     heights + the debug overlay all read the same variant.clipStyle).
   - "Audio waveforms" — menuitemcheckbox over the §4.7 per-track view
     flags: the store's setAllTrackWaveforms batch (R24-W5d — W1's debt
     paid: the per-track toggleTrackCmd flip loop could mint 2 entries per
     undefined track on the undefined→true→false double walk; the batch is
     ONE undoable write, and an already-converged click mints nothing).
     HONEST aria-disabled + reason tip while compact: the frozen compact
     strip has no waveform lanes to toggle ("Not available while tracks are
     compact"). */

import { useLayoutEffect, useRef, useState } from 'react';
import { useUi, resolveTimelineCompact } from '../../state/useUiStore';
import { useVariant } from '../debug/VariantProvider';
import { isMenuKey } from '../shell/ContextMenu';
import type { ClipStyle } from '../../lib/variants';

const MENU_TID = 'shell-menu-tl-view-options';
const OPENER_TID = 'shell-timeline-toolbar-btn-view-options';
const WAVEFORMS_DISABLED_TIP = 'Not available while tracks are compact';

/** The §4.7 convergence — R24-W5d (W1's debt paid): ONE store batch write
 *  sets every audio track's waveform flag to the target
 *  (setAllTrackWaveforms — a single undoable entry, a no-op when already
 *  converged; the old per-track toggleTrackCmd flip loop minted 2 entries
 *  per undefined track on the undefined→true→false double walk). */
function convergeWaveforms(target: boolean) {
  useUi.getState().setAllTrackWaveforms(target);
}

export function ViewOptionsPopover({ showCompact }: { showCompact: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 8, top: 8 });
  const openerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* store seams: the D-B3 density resolver + override write (the retired
     standalone button's write path, re-homed verbatim) */
  const compact = useUi((s) => resolveTimelineCompact(s));
  const setTimelineCompact = useUi((s) => s.setTimelineCompact);
  /* the §4.7 per-track waveform flags (audio tracks only — TrackHeader's
     Waveform view toggle carries the same kind gate). NOTE: the selector
     returns the STABLE scene object (never a freshly-filtered array — a
     new reference per call would loop useSyncExternalStore); the audio
     filter runs in render. */
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const waveformsOn = audio.every((t) => t.waveform !== false);
  const waveformsDisabled = compact; // frozen compact strip: no waveform lanes
  /* the CLIP_STYLE variant seam — ONE source with the debug overlay */
  const { variant, setVariant } = useVariant();
  const setClipStyle = (clipStyle: ClipStyle) => setVariant((v) => ({ ...v, clipStyle }));

  const close = () => {
    setOpen(false);
    // §4.9: focus returns to the opener
    openerRef.current?.focus();
  };
  const openMenu = () => {
    const r = openerRef.current?.getBoundingClientRect();
    setPos({ left: r && r.width > 0 ? r.left : 8, top: r && r.height > 0 ? r.bottom + 2 : 8 });
    setOpen(true);
  };

  /* clamp to viewport once measured + focus the first ENABLED item (the
     ContextMenu's own layout-effect law) */
  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    setPos((p) => ({
      left: Math.max(4, Math.min(p.left, window.innerWidth - el.offsetWidth - 4)),
      top: Math.max(4, Math.min(p.top, window.innerHeight - el.offsetHeight - 4)),
    }));
    const items = Array.from(
      el.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'),
    ).filter((n) => n.getAttribute('aria-disabled') !== 'true');
    const first = items[0];
    if (first) first.focus();
    else el.focus();
  }, [open]);

  /* the house menu keyboard grammar (ContextMenu's, verbatim): Escape
     closes; ↑/↓ rove with wrap, skipping aria-disabled; Tab dismisses (menus
     are not tab stops); Enter/Space stay native (button activation).
     stopPropagation keeps every shell shortcut (spec 16) out while open. */
  const onMenuKeydown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const dir: 1 | -1 = e.key === 'ArrowDown' ? 1 : -1;
      const el = menuRef.current;
      if (!el) return;
      const eligible = Array.from(
        el.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'),
      ).filter((n) => n.getAttribute('aria-disabled') !== 'true');
      if (eligible.length === 0) return;
      const cur = eligible.findIndex((m) => m === document.activeElement);
      const next = cur === -1
        ? (dir === 1 ? 0 : eligible.length - 1)
        : (dir === 1 ? (cur + 1) % eligible.length : (cur - 1 + eligible.length) % eligible.length);
      eligible[next].focus();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault(); // menus are not tab stops; Tab dismisses
      close();
      return;
    }
    if (e.key === 'Enter') {
      /* Enter activates the focused item. Native button keydown-activation
         exists in browsers but NOT in jsdom, and preventDefault here
         suppresses the browser's own activation — so this is the ONE
         guaranteed activation either way (no double-fire). Space stays
         native (its activation lands on keyup in browsers). */
      e.preventDefault();
      const a = document.activeElement as HTMLElement | null;
      if (a && menuRef.current?.contains(a)) a.click();
    }
  };

  return (
    <>
      {/* the view-options hamburger — R24-W1 (#64): the R14 dev-jargon toast
          died; the button is a real menu opener now. Still the one PRE-matrix
          house button: it is not a D-D2 cluster and stays on every page. */}
      <button
        ref={openerRef}
        className="icon-btn"
        data-testid={OPENER_TID}
        data-tip="Timeline view options"
        aria-label="Timeline view options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (open) return;
          /* APG menu-button: ArrowDown opens focusing the first item; the §4.9
             keyboard routes (Shift+F10 / ContextMenu key) open as well */
          if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(); return; }
          if (isMenuKey(e)) { e.preventDefault(); openMenu(); }
        }}
      >
        <svg width="16" height="13" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="1" y="1" width="22" height="4" /><rect x="1" y="7" width="22" height="4" /><rect x="1" y="13" width="22" height="4" />
        </svg>
      </button>
      {open && (
        <>
          {/* transparent overlay — click / scroll closes; no dark backdrop
              (§4.9: menus float over the unobstructed app) */}
          <div
            className="fixed inset-0 z-[104]"
            aria-hidden="true"
            onPointerDown={() => close()}
            onWheel={() => close()}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Timeline view options"
            tabIndex={-1}
            data-testid={MENU_TID}
            className="menu-pop"
            style={pos}
            onKeyDown={onMenuKeydown}
          >
            {/* Compact tracks — the D-B3 density law re-homed here (the
                standalone toolbar button is RETIRED, R24-W1). DOM-ABSENT on
                the FX page (showCompact false — the resolver ignores the
                override there, so no control may claim it). A checkbox
                setting: the menu STAYS OPEN across flips. */}
            {showCompact && (
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={compact}
                data-testid={`${MENU_TID}-compact`}
                data-tip="Compact strip (frozen) ↔ full tracks"
                className="menu-item"
                onClick={() => setTimelineCompact(compact ? 'off' : 'on')}
              >
                <span className="menu-check mono" aria-hidden="true">{compact ? '✓' : ''}</span>
                <span className="min-w-0 flex-1 truncate text-left">Compact tracks</span>
              </button>
            )}
            {showCompact && <div className="menu-sep" role="separator" aria-orientation="horizontal" />}

            {/* Clip style — menuitemradio pair on the variant context (ONE
                source with the debug overlay). Radio settings keep the menu
                open too (flip/flip-back, ARIA radiogroup-in-menu grammar). */}
            <div role="group" aria-label="Clip style">
              <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-tmuted" aria-hidden="true">
                Clip style
              </div>
              {([['filmstrip', 'Filmstrip'], ['blocks', 'Block']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={variant.clipStyle === id}
                  data-testid={`${MENU_TID}-clip-${id}`}
                  data-tip={id === 'filmstrip' ? 'spec 05 §7 — thumbs + waveforms' : 'compact solid clips'}
                  className="menu-item"
                  onClick={() => setClipStyle(id)}
                >
                  <span className="menu-check mono" aria-hidden="true">{variant.clipStyle === id ? '●' : ''}</span>
                  <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                </button>
              ))}
            </div>
            <div className="menu-sep" role="separator" aria-orientation="horizontal" />

            {/* Audio waveforms — the §4.7 per-track view flags, converged
                through the ONE-batch store seam (R24-W5d: a single undoable
                write, never the per-track flip walk).
                HONEST aria-disabled + reason tip while compact (the frozen
                strip has no waveform lanes); aria-disabled (not native
                disabled) keeps the honest-mock data-tip hoverable. */}
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={waveformsOn}
              aria-disabled={waveformsDisabled || undefined}
              data-testid={`${MENU_TID}-waveforms`}
              data-tip={waveformsDisabled ? WAVEFORMS_DISABLED_TIP : 'Show waveform lanes on every audio track'}
              className="menu-item"
              onMouseDown={(e) => { if (waveformsDisabled) e.preventDefault(); }}
              onClick={() => {
                if (waveformsDisabled) return;
                convergeWaveforms(!waveformsOn);
              }}
            >
              <span className="menu-check mono" aria-hidden="true">{waveformsOn ? '✓' : ''}</span>
              <span className="min-w-0 flex-1 truncate text-left">Audio waveforms</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

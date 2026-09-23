/* ViewOptionsPopover — R24-W1 (DESIGN-R24 §1.3 A3-R4; issues #64 + #62) →
   R25-W6 (DESIGN-R25 §1 R3+R5 / §3 W6-A+W6-C; threads th_mtzp94ms "the
   timeline style mode should be remembered on per view mode basis when
   switch they should restore" + th_mtzors21 "compact - video, compact -
   audio, compact - all"): the timeline view-options hamburger is a REAL APG
   menu, and every option is now PER-PAGE memory — the popover reads + writes
   the ACTIVE page's entry in the store's pageTimelineView map; switching
   pages restores the target page's entry automatically (every consumer keys
   by `page`; no restore action exists).

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

   Items (A3-R4 grammar, W6 laws):
   - "Compact tracks" — a FOUR-OPTION menuitemradio sub-group (off / video /
     audio / all — the reviewer's hybrid scopes, W6-C). A radio group fits a
     mutually-exclusive setting better than the old binary checkbox: the
     scope is one choice among four, exactly the Clip-style pair's grammar.
     DOM-ABSENT on the FX page (the matrix flag — fx forces the full
     Timeline; the resolver ignores the entry there, so no control may claim
     it). 'all' = the frozen compact strip (the old checkbox's "on");
     'video'/'audio' = hybrid modes — the full Timeline with per-kind
     compaction (resolveTrackClipStyle).
   - "Clip style: Filmstrip | Block" — a menuitemradio pair riding the
     ACTIVE PAGE's entry (W6-A: setTimelineClipStyle — the page's own
     memory). The VARIANT context stays the global DEFAULT (null entry
     inherits the live variant.clipStyle — the debug overlay remains the
     global seam; the popover no longer writes the variant, so data-clipstyle
     follows the VARIANT, not the page's memory — the R24-W1 "one source"
     law is RE-DERIVED per-page: entry ?? variant, ONE resolver).
   - "Audio waveforms" — menuitemcheckbox over the page's VIEW GATE
     (pageTimelineView[page].waveforms) AND the §4.7 per-track doc flags:
     the rendered lane = flag && gate. ON = the gate + the
     setAllTrackWaveforms batch (R24-W5d — ONE undoable write, the honest
     no-op arm — "every audio track" is true after it); OFF = the gate
     ALONE (view state, no history — converging the doc flags to false
     would leak the off into every other page and break the per-page
     restore). HONEST aria-disabled + reason tip while the AUDIO kind is
     compacted (scope 'audio' | 'all'): compacted audio lanes are the
     blocks anatomy — no waveform lanes to toggle ("Not available while
     audio tracks are compact"). Under 'video'/'off' the audio lanes are
     full and the option stays enabled — the W6-C per-kind re-derivation. */

import { useLayoutEffect, useRef, useState } from 'react';
import { useUi, resolveTimelineCompactScope } from '../../state/useUiStore';
import { useVariant } from '../debug/VariantProvider';
import { isMenuKey } from '../shell/ContextMenu';
import type { ClipStyle } from '../../lib/variants';

const MENU_TID = 'shell-menu-tl-view-options';
const OPENER_TID = 'shell-timeline-toolbar-btn-view-options';
const WAVEFORMS_DISABLED_TIP = 'Not available while audio tracks are compact';

/** The §4.7 convergence — R24-W5d (W1's debt paid): ONE store batch write
 *  sets every audio track's waveform flag to the target
 *  (setAllTrackWaveforms — a single undoable entry, a no-op when already
 *  converged; the old per-track toggleTrackCmd flip loop minted 2 entries
 *  per undefined track on the undefined→true→false double walk).
 *  W6-A: this is the popover's ON-path half — the OFF path writes ONLY the
 *  page's view gate (the doc flags must never carry a page's off). */
function convergeWaveforms(target: boolean) {
  useUi.getState().setAllTrackWaveforms(target);
}

/* W6-C: the four compact scopes, in radio order. 'all' = the frozen strip. */
const COMPACT_SCOPES: [id: 'off' | 'video' | 'audio' | 'all', label: string, tip: string][] = [
  ['off', 'Off', 'Full tracks — every kind at its own style'],
  ['video', 'Video', 'Video lanes compact to blocks; audio stays full'],
  ['audio', 'Audio', 'Audio lanes compact to blocks; video stays full'],
  ['all', 'All', 'The frozen compact strip (everything compacted)'],
];

export function ViewOptionsPopover({ showCompact }: { showCompact: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 8, top: 8 });
  const openerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* store seams — the W6-A per-page map: the ACTIVE page's entry is the ONE
     read; the writes below replace only this page's entry object (the other
     pages' memories are untouched by construction). */
  const scope = useUi((s) => resolveTimelineCompactScope(s));
  const setTimelineCompact = useUi((s) => s.setTimelineCompact);
  const pageView = useUi((s) => s.pageTimelineView[s.page]);
  const setTimelineClipStyle = useUi((s) => s.setTimelineClipStyle);
  const setTimelineWaveforms = useUi((s) => s.setTimelineWaveforms);
  /* the §4.7 per-track waveform flags (audio tracks only — TrackHeader's
     Waveform view toggle carries the same kind gate). NOTE: the selector
     returns the STABLE scene object (never a freshly-filtered array — a
     new reference per call would loop useSyncExternalStore); the audio
     filter runs in render. */
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  /* the checkbox reads the RENDERED convergence: the page gate AND every
     per-track flag (the tip's "every audio track" contract). */
  const waveformsOn = pageView.waveforms && audio.every((t) => t.waveform !== false);
  /* W6-C re-derivation: the option dies only when the AUDIO kind is
     compacted (scope 'audio' | 'all' — blocks lanes carry no waveforms);
     under 'video' the audio lanes are full and the option is live. */
  const waveformsDisabled = scope === 'audio' || scope === 'all';
  /* the CLIP_STYLE seam, W6-A re-derived: the page entry, else the live
     variant default (the debug overlay stays the global seam). */
  const { variant } = useVariant();
  const pageClipStyle: ClipStyle = pageView.clipStyle ?? variant.clipStyle;
  const setClipStyle = (clipStyle: ClipStyle) => setTimelineClipStyle(clipStyle);

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
            {/* Compact tracks — R25-W6-C (th_mtzors21): the binary checkbox
                is now a FOUR-OPTION menuitemradio sub-group (off / video /
                audio / all — the hybrid scopes). A radio fits the
                mutually-exclusive setting (same grammar as the Clip-style
                pair below); the writes land in the ACTIVE page's entry
                (W6-A memory). DOM-ABSENT on the FX page (showCompact false
                — the resolver ignores the entry there, so no control may
                claim it). Radio settings keep the menu OPEN. */}
            {showCompact && (
              <div role="group" aria-label="Compact tracks">
                <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-tmuted" aria-hidden="true">
                  Compact tracks
                </div>
                {COMPACT_SCOPES.map(([id, label, tip]) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={scope === id}
                    data-testid={`${MENU_TID}-compact-${id}`}
                    data-tip={tip}
                    className="menu-item"
                    onClick={() => setTimelineCompact(id)}
                  >
                    <span className="menu-check mono" aria-hidden="true">{scope === id ? '●' : ''}</span>
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                  </button>
                ))}
              </div>
            )}
            {showCompact && <div className="menu-sep" role="separator" aria-orientation="horizontal" />}

            {/* Clip style — menuitemradio pair on the ACTIVE PAGE's entry
                (W6-A: the page's own memory; the variant stays the global
                default for null entries — the debug overlay's dimension).
                Radio settings keep the menu open (flip/flip-back, ARIA
                radiogroup-in-menu grammar). */}
            <div role="group" aria-label="Clip style">
              <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-tmuted" aria-hidden="true">
                Clip style
              </div>
              {([['filmstrip', 'Filmstrip'], ['blocks', 'Block']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={pageClipStyle === id}
                  data-testid={`${MENU_TID}-clip-${id}`}
                  data-tip={id === 'filmstrip' ? 'spec 05 §7 — thumbs + waveforms' : 'compact solid clips'}
                  className="menu-item"
                  onClick={() => setClipStyle(id)}
                >
                  <span className="menu-check mono" aria-hidden="true">{pageClipStyle === id ? '●' : ''}</span>
                  <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                </button>
              ))}
            </div>
            <div className="menu-sep" role="separator" aria-orientation="horizontal" />

            {/* Audio waveforms — the §4.7 per-track flags AND the page's
                W6-A view gate. ON = the gate + the ONE-batch store seam
                (R24-W5d: a single undoable write, never the per-track flip
                walk — "every audio track" is true after it); OFF = the gate
                alone (view state, no history — the doc flags never carry a
                page's off, so the per-page restore works).
                HONEST aria-disabled + reason tip while the AUDIO kind is
                compacted (scope 'audio' | 'all' — blocks lanes carry no
                waveform lanes); aria-disabled (not native disabled) keeps
                the honest-mock data-tip hoverable. */}
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
                const target = !waveformsOn;
                setTimelineWaveforms(target);
                if (target) convergeWaveforms(true);
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

/* toolbar2 — spec 18 §4.1: panel toggles left, project title center,
   inspector right. Mock's Index/Sound Library/Mixer/Metadata dropped per §8
   chrome-removal ledger. R19: mac traffic-light dots removed (th_mtoyslr9) —
   the mock runs in a browser page, not an OS window, so the faux window
   chrome read as decoration-only clutter; fullscreen toggle removed
   (th_mtoyu8bl, gap C38) — see the removal note below.

   R22 (DESIGN-R22 D5; issues #73/#80/#86/#87): the toggle home is
   RESTRUCTURED — the user: "for panels that are togglable, mixer console as
   an example, these can be toggled from here, just like the left side
   (media / effects etc.) under Color view" (#73):
     left:  [Media Pool] — the label follows the page's asset domain (#80:
            "these should change, no longer media pool if you use this to
            show other panels"): Media Pool on Edit/Color/Deliver, Sound
            Library on Audio (the slot really gates the SoundLibrary there —
            the old label lied).
     right: [Scopes ·color] [Nodes ·color] [Mixer] [Inspector] — the console
            toggles (the mixer's aria-pressed derives from the REAL
            mixerState; on the color page the FLOOR auto-degrade is honest).
   REMOVED: the Effects button (#86 — "this should go away"; effects assets
   move to the Effect view per #82, W6) and the Project button (#87 — it WAS
   functional (a read-only ProjectSheet stub, inspectorProjectMode) but read
   as non-functional; the space now carries the console toggles. The store
   field stays dead-but-harmless — README deviation row). spec 18 §8's
   chrome-removal ledger row amended: the Mixer toggle is BACK by user
   directive (#73). */

import { useRef, useState } from 'react';
import { PanelLeft, Activity, Layers, SlidersHorizontal, AudioWaveform, Sparkles } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project } from '../../lib/mockData';

export function Toolbar2() {
  const panels = useUi((s) => s.panels);
  const togglePanel = useUi((s) => s.togglePanel);
  const page = useUi((s) => s.page);
  const colorScopesState = useUi((s) => s.colorScopesState);
  const setColorScopesState = useUi((s) => s.setColorScopesState);
  const colorNodesDock = useUi((s) => s.colorNodesDock);
  const toggleColorNodesDock = useUi((s) => s.toggleColorNodesDock);
  const mixerState = useUi((s) => s.mixerState);
  const cycleMixerState = useUi((s) => s.cycleMixerState);

  /* roving tabindex (spec 18 §11.1 P2, ARIA toolbar pattern): exactly ONE
     button is a tab stop; ←/→ move focus between buttons in DOM order
     (wrapping), Home/End jump to the ends. Tab is left natural — it exits
     the toolbar to the next document stop, as the pattern prescribes. */
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rover, setRover] = useState(0);
  const focusRover = (i: number) => {
    const n = btnRefs.current.filter(Boolean).length;
    const idx = ((i % n) + n) % n; // wrap in both directions
    setRover(idx);
    btnRefs.current[idx]?.focus();
  };
  const onToolbarKey = (e: React.KeyboardEvent, n: number) => {
    if (n === 0) return;
    /* focus (document.activeElement) is the source of truth — the rover
       state only tracks the tab stop, so direct .focus() calls (tests,
       screen readers) can never desync the arrow model */
    const cur = btnRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    const from = cur === -1 ? rover : cur;
    if (e.key === 'ArrowRight') { e.preventDefault(); focusRover(from + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusRover(from - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusRover(0); }
    else if (e.key === 'End') { e.preventDefault(); focusRover(n - 1); }
  };
  /* per-button roving props — indices are DENSE and follow the buttons
     that actually render (the color-only console toggles are absent on
     other pages; holes would strand the arrow cycle). onFocus keeps the
     tab stop synced with real focus so clicks/mouse users don't fight the
     arrow model. */
  const roverProps = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => { btnRefs.current[i] = el; },
    tabIndex: i === rover ? 0 : -1,
    onFocus: () => setRover(i),
  });

  /* #80: the left toggle's label follows the page's asset domain — the
     audio page's slot really is the Sound Library (LeftDock routes there),
     so the button must not lie. R23-WA: the FX page's slot is the effects
     browser (D-A5/D-D1 — LeftDock routes there); the label reads "Effects"
     per the D-D1 content table (the dock's own header names the surface). */
  const leftLabel = page === 'audio' ? 'Sound Library' : page === 'fx' ? 'Effects' : 'Media Pool';
  const LeftIcon = page === 'audio' ? AudioWaveform : page === 'fx' ? Sparkles : PanelLeft;

  /* the Scopes toggle: off ↔ last-visual-state (row/grid — D3); aria-pressed
     honest while any visual state is live. */
  const scopesOpen = colorScopesState !== 'off';
  const toggleScopes = () => {
    const s = useUi.getState();
    setColorScopesState(scopesOpen ? 'off' : s.colorScopesLastVisual);
  };

  /* dense DOM order: pool=0, then (color only) scopes, nodes, then mixer,
     inspector — indices recompute per page so no holes strand the rover */
  const iScopes = 1;
  const iNodes = page === 'color' ? 2 : 0;
  const iMixer = page === 'color' ? 3 : 1;
  const iInspector = page === 'color' ? 4 : 2;
  /* the rendered count drives the wrap (End = last rendered index) */
  const nButtons = page === 'color' ? 5 : 3;

  return (
    <div
      data-testid="shell-toolbar"
      role="toolbar"
      aria-label="Shell toolbar"
      onKeyDown={(e) => onToolbarKey(e, nButtons)}
      className="flex items-center gap-2 border-b border-hairline bg-shell px-2.5"
      style={{ height: 'var(--bar-h)', minHeight: 'var(--bar-h)' }}
    >
      {/* th_mtoyslr9: the mac traffic-light dots are GONE — the mock is a web
          page, not an OS window; faux window chrome answered nothing and read
          as removable decoration (reviewer: "remove these"). */}

      <button
        {...roverProps(0)}
        className={`toolbtn ${panels.mediaPool ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-mediapool"
        aria-pressed={panels.mediaPool}
        onClick={() => togglePanel('mediaPool')}
      >
        <LeftIcon size={14} strokeWidth={1.7} />
        <span>{leftLabel}</span>
      </button>
      {/* R22-D5 (#86): the Effects button is GONE — the slot it toggled moves
          to the Effect view (issue #82, W6). panels.effects stays in the
          store (dead-but-harmless; README deviation row). */}

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-3">
        <span className="max-w-[240px] truncate font-semibold text-tprimary" title={project.metadata.name}>
          {project.metadata.name}
        </span>
        <span className="text-tfaint">|</span>
        <span className="text-tmuted">{project.metadata.status}</span>
      </div>

      {/* R22-D5 (#73): the console toggles — right side, exactly like the
          left-side asset toggles. Scopes + Nodes are color-page consoles. */}
      {page === 'color' && (
        <button
          {...roverProps(iScopes)}
          className={`toolbtn ${scopesOpen ? 'active' : ''}`}
          data-testid="shell-toolbar-btn-scopes"
          aria-pressed={scopesOpen}
          onClick={toggleScopes}
        >
          <Activity size={14} strokeWidth={1.7} />
          <span>Scopes</span>
        </button>
      )}
      {page === 'color' && (
        <button
          {...roverProps(iNodes)}
          className={`toolbtn ${colorNodesDock ? 'active' : ''}`}
          data-testid="shell-toolbar-btn-nodes"
          aria-pressed={colorNodesDock}
          onClick={toggleColorNodesDock}
        >
          <Layers size={14} strokeWidth={1.7} />
          <span>Nodes</span>
        </button>
      )}
      <button
        {...roverProps(iMixer)}
        className={`toolbtn ${mixerState !== 'collapsed' ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-mixer"
        aria-pressed={mixerState !== 'collapsed'}
        title={`Mixer — ${mixerState === 'collapsed' ? 'collapsed' : mixerState}; click cycles collapsed → meters → full`}
        onClick={cycleMixerState}
      >
        <SlidersHorizontal size={14} strokeWidth={1.7} />
        <span>Mixer</span>
      </button>
      <button
        {...roverProps(iInspector)}
        className={`toolbtn ${panels.inspector ? 'active' : ''}`}
        data-testid="shell-toolbar-btn-inspector"
        aria-pressed={panels.inspector}
        onClick={() => togglePanel('inspector')}
      >
        <SlidersHorizontal size={14} strokeWidth={1.8} />
        <span>Inspector</span>
      </button>
      {/* R22-D5 (#87): the Project button is GONE — it toggled the read-only
          ProjectSheet stub (inspectorProjectMode) but read as non-functional;
          the space carries the console toggles above. The store field stays
          dead-but-harmless (README deviation row). th_mtoyu8bl (gap C38): the
          fullscreen-viewer toggle was already removed (honest removal). */}
    </div>
  );
}

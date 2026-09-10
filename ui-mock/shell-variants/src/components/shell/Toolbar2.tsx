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
            show other panels"): Media Pool on Edit, Sound Library on
            Audio, Effects on FX, Stills on Color.
     right: [Scopes ·color] [Nodes ·color] [Mixer ·audio] [Inspector].
   R23-WB (D-B5, #92) → R24-W1 (DESIGN-R24 §1.3 A3-R3; issues #65/#66 —
   SUPERSEDES the edit+audio row, registered in the README deviation
   ledger): the Mixer toggle is a BINARY open/close toggle (toggleMixerOpen,
   with lastVisual memory) and renders on the AUDIO page ONLY — DOM-absent
   on edit/color/fx/deliver (never display:none). Resolve's Edit page can
   show a mixer only via Workspace; the user's ruling wins (#66 "mixer
   shouldn't be here when it is not audio workflow"). The setPage exit law
   collapses an open mixer on every non-audio page, so nothing dangles
   unclosable. Glyph law: AudioLines when CLOSED (opening shows strips),
   SlidersVertical when OPEN — never SlidersHorizontal (the Inspector
   collision glyph F1 caught).
   R23-WD (DESIGN-R23 D-D1; #100/#106/#91 + Part IX ruling 16): the left
   toggle's label/icon AND its render-or-not now read the ONE table —
   leftDockContent(page) in ./leftDockContent (the label names the dock's
   actual content; single content per page). On DELIVER the toggle is
   DOM-ABSENT: the deliver mainbody is DeliverPage's own 3-region layout
   with its own presets rail — a toolbar toggle there would be the lying
   control #100 flags. The rover indices stay dense over the buttons that
   actually render (the hidden toggle leaves no hole).
   REMOVED: the Effects button (#86) and the Project button (#87). */

import { useRef, useState } from 'react';
import { Activity, Layers, SlidersHorizontal, AudioLines, SlidersVertical } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project } from '../../lib/mockData';
import { leftDockContent } from './leftDockContent';

export function Toolbar2() {
  const panels = useUi((s) => s.panels);
  const togglePanel = useUi((s) => s.togglePanel);
  const page = useUi((s) => s.page);
  const colorScopesState = useUi((s) => s.colorScopesState);
  const setColorScopesState = useUi((s) => s.setColorScopesState);
  const colorNodesDock = useUi((s) => s.colorNodesDock);
  const toggleColorNodesDock = useUi((s) => s.toggleColorNodesDock);
  const mixerState = useUi((s) => s.mixerState);
  const toggleMixerOpen = useUi((s) => s.toggleMixerOpen);

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
  /* R23-WD (D-D1): the left toggle reads the ONE table — leftDockContent
     (page) — so its label, icon, and whether it renders at all are exactly
     the dock's real content per page. DELIVER's null entry HIDES the
     button (ruling 16: DeliverPage owns its presets rail; a toggle there
     would lie). The label never drifts from the dock again (#80/#100).
     R23-FIX (review-sweep R-c, item 11): the toggle renders ONLY on the
     gatedByPool pages (edit + color). The audio + fx pages own the whole
     left slot — the dock mounts regardless of the pool flag — so a toggle
     there would claim a toggle it can't perform (the pool flag gates
     nothing on those pages; the lying-control #100 law). DOM-absent, never
     display:none. */
  const dock = leftDockContent(page);
  const showLeft = dock !== null && dock.gatedByPool;
  const leftIcon = dock ? <dock.icon size={14} strokeWidth={1.7} /> : null; // audio/fx/deliver: never rendered
  const leftLabel = dock?.label ?? '';

  /* the Scopes toggle: off ↔ open — the R22 4-state machine and its
     lastVisual memory died with the squeeze (D-B1; the TABS are the
     layout now). */
  const scopesOpen = colorScopesState === 'open';
  const toggleScopes = () => {
    setColorScopesState(scopesOpen ? 'off' : 'open');
  };

  /* R24-W1 (A3-R3; issues #65/#66): the Mixer toggle is AUDIO ONLY —
     DOM-absent on edit/color/fx/deliver (R23-WB's edit+audio row is
     superseded). The button is a BINARY open/close toggle (toggleMixerOpen,
     with the lastVisual memory) — the meters↔full MODE lives in the dock
     header's own controls. */
  const showMixer = page === 'audio';
  const mixerOpen = mixerState !== 'collapsed';

  /* dense DOM order: the left asset toggle (audio/fx/deliver hide it —
     ruling 16 + the R-c slot-ownership law), then (color only) scopes,
     nodes, then (audio only) mixer, then inspector. The indices are
     CONTIGUOUS over the buttons that actually render (a hole where the
     left toggle's index would sit on audio/fx/deliver — or between nodes
     and inspector on color — strands the arrows: the wrap math counts
     rendered buttons). */
  let next = 0;
  const iLeft = showLeft ? next++ : -1;
  const iScopes = page === 'color' ? next++ : -1;
  const iNodes = page === 'color' ? next++ : -1;
  const iMixer = showMixer ? next++ : -1;
  const iInspector = next;
  /* the rendered count drives the wrap (End = last rendered index) */
  const nButtons = iInspector + 1;

  /* per-button roving props — indices are DENSE and follow the buttons
     that actually render (the color-only console toggles are absent on
     other pages; holes would strand the arrow cycle). onFocus keeps the
     tab stop synced with real focus so clicks/mouse users don't fight the
     arrow model. The tab stop is CLAMPED to the rendered count: a page
     flip can leave a stale rover (color's 4 buttons → edit's 3) — an
     unclamped stop would leave the toolbar with NO tab stop until the
     arrows self-heal it. */
  const stop = Math.min(rover, nButtons - 1);
  const roverProps = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => { btnRefs.current[i] = el; },
    tabIndex: i === stop ? 0 : -1,
    onFocus: () => setRover(i),
  });

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

      {/* R23-WD (D-D1, ruling 16 + R23-FIX R-c): the left asset toggle —
          DOM-ABSENT on deliver (leftDockContent null) AND on audio/fx
          (gatedByPool false — those pages own the slot unconditionally;
          the toggle would lie). Edit + color keep the table-driven label
          + icon so the button always names the dock it opens. */}
      {showLeft && (
        <button
          {...roverProps(iLeft)}
          className={`toolbtn ${panels.mediaPool ? 'active' : ''}`}
          data-testid="shell-toolbar-btn-mediapool"
          aria-pressed={panels.mediaPool}
          onClick={() => togglePanel('mediaPool')}
        >
          {leftIcon}
          <span>{leftLabel}</span>
        </button>
      )}
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
          left-side asset toggles. Scopes + Nodes are color-page consoles
          (the Nodes toggle now opens the VIEWER-REGION surface, D-B2). */}
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
      {/* R24-W1 (A3-R3; #65/#66): the Mixer toggle — AUDIO page only
          (DOM-absent on edit/color/fx/deliver — the R23-WB edit+audio row is
          superseded; Resolve's Edit page shows a mixer only via Workspace).
          BINARY open/close with the lastVisual memory: AudioLines when closed
          (opening shows strips), SlidersVertical when open — NEVER
          SlidersHorizontal (the Inspector collision glyph). The setPage exit
          law collapses an open mixer on every non-audio page, so the console
          is never stranded unclosable. */}
      {showMixer && (
        <button
          {...roverProps(iMixer)}
          className={`toolbtn ${mixerOpen ? 'active' : ''}`}
          data-testid="shell-toolbar-btn-mixer"
          aria-pressed={mixerOpen}
          title={mixerOpen ? 'Hide audio mixer' : 'Show audio mixer'}
          onClick={toggleMixerOpen}
        >
          {mixerOpen ? (
            <SlidersVertical size={14} strokeWidth={1.7} />
          ) : (
            <AudioLines size={14} strokeWidth={1.7} />
          )}
          <span>Mixer</span>
        </button>
      )}
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

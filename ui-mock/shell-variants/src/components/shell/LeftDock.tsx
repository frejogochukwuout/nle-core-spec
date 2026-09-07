/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE surface instead of two side-by-side strips.
   R22-D1/D7 (DESIGN-R22): the COLOR page keeps the media pool here — tabs
   [Pool | Stills]; the Stills tab is the color-grading-asset surface
   (issue #82: "under Color Grading view for color grading assets"). The
   node graph NEVER docks here (it is the NodeGraphDock console, #77/#78).
   Routing law (reads the store only — the AppShell mounts <LeftDock/> in
   the mediaW slot; the orchestrator wires that in Wave III):
     - page 'audio'            → SoundLibrary (the pre-existing audio-focus
                                  swap, unchanged);
     - BOTH mediaPool+effects  → tab bar (Media Pool | Effects) + the active
                                  panel, in the SAME slot the bin occupied;
     - single-on               → that panel alone, no tab bar;
     - both off                → nothing (the parent hides the slot).
   The EffectsPanel below is COPIED from AppShell.tsx (its original home —
   AppShell is off-limits to B2) so the drag-to-clip contract
   (application/x-nle-effect JSON {name, cat}) and every data-testid stay
   byte-identical; when the orchestrator retires the AppShell copy in Wave
   III this becomes the single home. */

import { useRef, useState } from 'react';
import { Sparkles, ImageIcon } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { MediaPool } from './MediaPool';
import { SoundLibrary } from '../mixer/SoundLibrary';
import { StillsPanel } from '../pages/color/StillsPanel';

/* ---------- effects library (compact mock of the Effects toggle §4.1) —
   verbatim copy from AppShell.tsx; contract frozen) ---------- */
const EFFECTS = [
  { name: 'Gaussian Blur', cat: 'Blur' },
  { name: 'Motion Blur', cat: 'Blur' },
  { name: 'Vignette', cat: 'Stylize' },
  { name: 'Glow', cat: 'Stylize' },
  { name: 'Chromatic Aberration', cat: 'Stylize' },
  { name: 'Cross Dissolve', cat: 'Transition' },
  { name: 'Dip to Black', cat: 'Transition' },
  { name: 'Wipe Left', cat: 'Transition' },
];

/* drag-to-clip payload contract (spec 15 §5.4 drag-to-lane spirit): the
   timeline Clip drop target consumes this exact MIME type + JSON shape and
   applies the effect through addEffectToElement. FIXED CONTRACT — do not
   change the type string or the payload keys. */
const EFFECT_DRAG_TYPE = 'application/x-nle-effect';
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function EffectsPanel() {
  const pushToast = useUi((s) => s.pushToast);
  return (
    /* fills the dock slot (the old AppShell copy was a fixed w-[220px] rail;
       here the slot width is the mediaW splitter — same surface, one home) */
    <div data-testid="shell-effects" className="flex h-full min-h-0 w-full flex-col bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[11px] font-semibold text-tprimary">Effects</span>
      </div>
      <div className="scroll-y min-h-0 flex-1 p-1.5">
        {['Blur', 'Stylize', 'Transition'].map((cat) => (
          <div key={cat} className="mb-2">
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-tfaint">{cat}</div>
            {EFFECTS.filter((e) => e.cat === cat).map((e) => (
              /* dual route (R14 no-op fix): DnD rows are the REAL apply path
                 (drag → Clip drop target → addEffectToElement), while click is
                 the honest fallback for users who can't complete a drag — a
                 toast explains where the apply + param UI actually live. A
                 button element keeps the fallback keyboard-operable. */
              <button
                key={e.name}
                type="button"
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.setData(EFFECT_DRAG_TYPE, JSON.stringify({ name: e.name, cat: e.cat }));
                  ev.dataTransfer.effectAllowed = 'copy';
                  ev.dataTransfer.dropEffect = 'copy';
                }}
                onClick={() => pushToast({
                  kind: 'info',
                  title: `Add ${e.name}`,
                  detail: 'drag the row onto a timeline clip to apply (mock drag-to-clip, spec 15 §5.4); the Inspector Effects tab carries the param UI',
                })}
                data-testid={`shell-effects-row-${slug(e.name)}`}
                aria-label={`Effect ${e.name}`}
                className="w-full cursor-grab rounded-[var(--radius)] border border-transparent px-2 py-1.5 text-left text-[11px] text-tmuted hover:border-soft hover:bg-[var(--hover-overlay)] hover:text-tprimary active:cursor-grabbing"
              >
                {e.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- the dock ---------- */

type LeftDockTab = 'pool' | 'effects' | 'stills';

/* the COLOR page's tab row — Pool | Stills (the color assets, R22-D7). */
function ColorTabs({ tab, setTab, tabRefs, onTabsKeyDown }: {
  tab: LeftDockTab;
  setTab: (t: LeftDockTab) => void;
  tabRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onTabsKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Left dock"
      className="flex shrink-0 items-stretch border-b border-hairline"
      onKeyDown={onTabsKeyDown}
    >
      <button
        type="button"
        role="tab"
        id="leftdock-tab-pool"
        aria-selected={tab === 'pool'}
        aria-controls="leftdock-panel-pool"
        tabIndex={tab === 'pool' ? 0 : -1}
        data-testid="shell-leftdock-tab-pool"
        ref={(el) => { tabRefs.current[0] = el; }}
        onClick={() => setTab('pool')}
        className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
          tab === 'pool' ? 'border-b-2 border-[var(--accent-selection)] text-tprimary' : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
        }`}
      >
        Media Pool
      </button>
      <button
        type="button"
        role="tab"
        id="leftdock-tab-stills"
        aria-selected={tab === 'stills'}
        aria-controls="leftdock-panel-stills"
        tabIndex={tab === 'stills' ? 0 : -1}
        data-testid="shell-leftdock-tab-stills"
        ref={(el) => { tabRefs.current[1] = el; }}
        onClick={() => setTab('stills')}
        className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
          tab === 'stills' ? 'border-b-2 border-[var(--accent-selection)] text-tprimary' : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
        }`}
      >
        <ImageIcon size={11} strokeWidth={1.7} aria-hidden="true" />
        Stills
      </button>
    </div>
  );
}

export function LeftDock() {
  const page = useUi((s) => s.page);
  const panels = useUi((s) => s.panels);
  const [tab, setTab] = useState<LeftDockTab>('pool'); // local view state — not doc, not a store pref
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* the audio page owns the whole slot (Fairlight-style left dock), exactly
     like the pre-R19 AppShell swap — no pool/effects tabs on the audio page */
  if (page === 'audio') return <SoundLibrary />;

  const poolOn = panels.mediaPool;
  const fxOn = panels.effects;
  const colorPage = page === 'color';

  /* ARIA tabs pattern (roving tabindex): one tab stop, ←/→ switch tabs
     (wrapping); aria-selected carries the active panel. Page-aware second
     tab: stills on color (R22-D7), effects elsewhere. */
  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const second: LeftDockTab = colorPage ? 'stills' : 'effects';
      const next = tab === 'pool' ? second : 'pool';
      setTab(next);
      const idx = next === 'pool' ? 0 : 1;
      tabRefs.current[idx]?.focus();
    }
  };

  /* R22-D7: on the COLOR page the second tab is STILLS (the color assets,
     issue #82) and it is ALWAYS present beside the pool — the mediaPool
     toggle gates the whole dock (the user's #77 law: the pool STAYS). On
     other pages the single-on collapse law is unchanged (pool, else
     effects); effects assets move to the Effect view (issue #82) when it
     lands. */
  if (colorPage) {
    if (!poolOn) return null; // parent hides the slot; nothing to dock
    return (
      <div data-testid="shell-leftdock" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
        <ColorTabs tab={tab} setTab={setTab} tabRefs={tabRefs} onTabsKeyDown={onTabsKeyDown} />
        <div className="min-h-0 flex-1">
          {tab === 'stills' ? (
            <div id="leftdock-panel-stills" role="tabpanel" aria-labelledby="leftdock-tab-stills" className="h-full min-h-0">
              <StillsPanel />
            </div>
          ) : (
            <div id="leftdock-panel-pool" role="tabpanel" aria-labelledby="leftdock-tab-pool" className="h-full min-h-0">
              <MediaPool />
            </div>
          )}
        </div>
      </div>
    );
  }
  if (!poolOn && !fxOn) return null; // parent hides the slot; nothing to dock

  const bothOn = poolOn && fxOn;
  /* single-on collapses to that panel regardless of tab history — the tab
     state only arbitrates when BOTH are on */
  const activePanel: LeftDockTab = bothOn ? tab : poolOn ? 'pool' : 'effects';

  return (
    <div data-testid="shell-leftdock" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      {bothOn && (
        <div
          role="tablist"
          aria-label="Left dock"
          className="flex shrink-0 items-stretch border-b border-hairline"
          onKeyDown={onTabsKeyDown}
        >
          <button
            type="button"
            role="tab"
            id="leftdock-tab-pool"
            aria-selected={tab === 'pool'}
            aria-controls="leftdock-panel-pool"
            tabIndex={tab === 'pool' ? 0 : -1}
            data-testid="shell-leftdock-tab-pool"
            ref={(el) => { tabRefs.current[0] = el; }}
            onClick={() => setTab('pool')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              tab === 'pool' ? 'border-b-2 border-[var(--accent-selection)] text-tprimary' : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
            }`}
          >
            Media Pool
          </button>
          <button
            type="button"
            role="tab"
            id="leftdock-tab-effects"
            aria-selected={tab === 'effects'}
            aria-controls="leftdock-panel-effects"
            tabIndex={tab === 'effects' ? 0 : -1}
            data-testid="shell-leftdock-tab-effects"
            ref={(el) => { tabRefs.current[1] = el; }}
            onClick={() => setTab('effects')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              tab === 'effects' ? 'border-b-2 border-[var(--accent-selection)] text-tprimary' : 'border-b-2 border-transparent text-tmuted hover:text-tprimary'
            }`}
          >
            <Sparkles size={11} strokeWidth={1.7} aria-hidden="true" />
            Effects
          </button>
        </div>
      )}

      {/* panels — ids match aria-controls; the hidden panel stays unmounted
          (MediaPool carries timers/prefs that a display:none copy would
          double-run) */}
      <div className="min-h-0 flex-1">
        {activePanel === 'effects' ? (
          <div id="leftdock-panel-effects" role="tabpanel" aria-labelledby="leftdock-tab-effects" className="h-full min-h-0">
            <EffectsPanel />
          </div>
        ) : activePanel === 'stills' ? (
          <div id="leftdock-panel-stills" role="tabpanel" aria-labelledby="leftdock-tab-stills" className="h-full min-h-0">
            <StillsPanel />
          </div>
        ) : (
          <div id="leftdock-panel-pool" role="tabpanel" aria-labelledby={bothOn ? 'leftdock-tab-pool' : undefined} className="h-full min-h-0">
            <MediaPool />
          </div>
        )}
      </div>
    </div>
  );
}

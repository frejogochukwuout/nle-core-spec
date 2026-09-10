/* AppShell — spec 18 §3 layout: toolbar2 / mainbody (media pool + viewer +
   inspector) / timeline block (toolbar, scene tabs, timeline) / status strip /
   app dock. Splitters: 6px visual line / 12px interactive hit target,
   double-click resets (§3.2). Splitters OWN the seam lines — adjacent panels
   carry no borders (single-source seams, no double hairlines). Page dock
   swaps the right rail (Edit → Inspector, Color → ColorInspector tabs,
   Deliver → export panel) — all at the same resizable inspectorW.

   R22 (DESIGN-R22 D1) — the color page composition REWRITTEN (issues
   #74/#77/#78/#79) → R23-WB (DESIGN-R23 track B — #90–#97) → R24-W2
   (DESIGN-R24 §1.2 A2-R1/R2/R3; issues #67/#64/#68 — SUPERSEDES the
   R23-WB D-B1/D-B2 composition): the timeline density is the D-B3 store
   law (compact default on color, the EVERY-PAGE toggle overrides; the
   mainbody default is 55% ONLY while compact, 40% when full tracks are
   asked for — the filmstrip needs lane room); the left dock on color is
   the Stills GALLERY (D-B4/#91 → W2 renames it Gallery, A2-R5). THE W2
   COMPOSITION: region [2] is ALWAYS Viewer-led (the ColorNodeGraph ⇄
   Viewer swap is DELETED — #67 "NOT here blocking the preview"); the
   graph re-homes to the console-row slot [6] with its own 26px
   nodeviewer header + 38px toolbar + the 706×268 scroll-both workspace;
   the ScopesDock re-homes to the ~160px pane at the BOTTOM of region
   [2]'s column (colorScopesState-gated, never a new F6 stop). Page-aware
   defaults (D2/D8): the color page's inspector = 420px until the user
   drags (inspectorWUserSet). */

import { useEffect, useRef, type ReactNode } from 'react';
import { useUi, resolveTimelineCompact } from '../../state/useUiStore';
import { leftDockContent } from './leftDockContent';
import { Toolbar2 } from './Toolbar2';
import { MixerDock } from '../mixer/MixerDock';
import { LeftDock } from './LeftDock';
import { Viewer } from './Viewer';
import { Inspector } from './Inspector';
import { StatusStrip } from './StatusStrip';
import { AppDock } from './AppDock';
import { TimelineToolbar } from '../timeline/TimelineToolbar';
import { SceneTabs } from '../timeline/SceneTabs';
import { Timeline } from '../timeline/Timeline';
import { ColorInspector, ColorNodeGraph, ScopesDock } from '../pages/ColorPage';
import { TimelineCompact } from '../timeline/TimelineCompact';
import { DeliverPage } from '../pages/DeliverPage';
import { ChannelEditor } from '../mixer/ChannelEditor';
import { MarkerInspector } from '../panels/MarkerInspector';
import { CaptionInspector } from '../panels/CaptionInspector';
import { FxInspector } from '../fx/FxInspector';
import { sceneDuration, findElement } from '../../lib/mockData';
import { useShortcuts } from '../../hooks/useShortcuts';
import { ToastRegion } from './ToastRegion';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

/* ---------- splitters (§3.2: 6px visual line, 12px hit target, dbl-click resets) ---------- */
const SPLIT_HIT = 12; // §3.2: 12px interactive hit; visual line is the 6px --split-visual token

function VSplitter({ onDrag }: { onDrag: (dx: number) => void }) {
  const start = useRef(0);
  /* §11 a11y floor: separator is keyboard-operable — ←/→ = 8px steps,
     ⇧ ×4 = 32px (the R13 reviewer's ladder; R14 adds the shift multiplier) */
  const keyStep = (dir: 1 | -1, shift: boolean) => onDrag(dir * 8 * (shift ? 4 : 1));
  return (
    <div
      className="group relative z-10 flex shrink-0 cursor-col-resize items-center justify-center bg-app"
      style={{ width: SPLIT_HIT }}
      onDoubleClick={() => onDrag(0)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); keyStep(-1, e.shiftKey); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); keyStep(1, e.shiftKey); }
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        onDrag(e.clientX - start.current);
        start.current = e.clientX;
      }}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
    >
      <div className="h-full w-[var(--split-visual)] flex items-center justify-center">
        <div className="h-[96%] w-px bg-hairline transition-colors group-hover:bg-accent" />
      </div>
    </div>
  );
}

function HSplitter({ onDrag }: { onDrag: (dy: number) => void }) {
  const start = useRef(0);
  /* ↑/↓ = 8px steps, ⇧ ×4 = 32px (same ladder as VSplitter) */
  const keyStep = (dir: 1 | -1, shift: boolean) => onDrag(dir * 8 * (shift ? 4 : 1));
  return (
    <div
      className="group relative z-10 flex shrink-0 cursor-row-resize items-center justify-center bg-app"
      style={{ height: SPLIT_HIT }}
      onDoubleClick={() => onDrag(0)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); keyStep(-1, e.shiftKey); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); keyStep(1, e.shiftKey); }
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        onDrag(e.clientY - start.current);
        start.current = e.clientY;
      }}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize timeline"
    >
      <div className="flex h-[var(--split-visual)] w-full items-center justify-center">
        <div className="h-px w-[96%] bg-hairline transition-colors group-hover:bg-accent" />
      </div>
    </div>
  );
}

/* ---------- shell ---------- */

/* beforeunload-on-dirty (spec 18 §6.4) — SIMPLEST honest mock: "unsaved" =
   pending undo history (past.length > 0). The scene.dirty flags are seeded
   display state for the tab dots, not a real autosave lifecycle (spec 09
   §6.1 events are not wired here), so they are deliberately NOT counted —
   counting them would prompt on a freshly loaded project with zero edits.
   When the real autosave dirty/flushed events land, this swaps to them. */
function useBeforeUnloadGuard() {
  const dirty = useUi((s) => s.past.length > 0);
  useEffect(() => {
    if (!dirty) {
      window.onbeforeunload = null;
      return;
    }
    window.onbeforeunload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    return () => { window.onbeforeunload = null; };
  }, [dirty]);
}

/* Provider wrapper: §6.4's ConfirmProvider sits OUTSIDE the hook consumers so
   the keyboard layer (useShortcuts → multi-delete confirm) shares the same
   dialog provider as the clip-menu path — one confirm surface, one focus
   trap, one dialog at a time. */
export function AppShell() {
  return (
    <ConfirmProvider>
      <AppShellInner />
    </ConfirmProvider>
  );
}

function AppShellInner() {
  const confirm = useConfirm();
  const panels = useUi((s) => s.panels);
  const page = useUi((s) => s.page);
  const mediaW = useUi((s) => s.mediaW);
  const inspectorW = useUi((s) => s.inspectorW);
  const mainBodyH = useUi((s) => s.mainBodyH);
  const setMediaW = useUi((s) => s.setMediaW);
  const setInspectorW = useUi((s) => s.setInspectorW);
  const setMainBodyH = useUi((s) => s.setMainBodyH);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const selectedMarkerId = useUi((s) => s.selectedMarkerId);
  const selection = useUi((s) => s.selection);
  const mixerVisible = useUi((s) => s.mixerState !== 'collapsed');
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];
  const duration = sceneDuration(scene);

  /* playback loop (rAF; mock "engine") — honors JKL playRate (shuttle) */
  const playing = useUi((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = useUi.getState();
      let t = s.playhead + dt * s.playRate;
      if (s.loopEnabled && s.playRate > 0 && t >= s.loop.end) t = s.loop.start;
      if (s.playRate > 0 && t >= duration) {
        t = duration;
        useUi.getState().setPlaying(false);
      }
      if (s.playRate < 0 && t <= 0) {
        t = 0;
        useUi.getState().setPlaying(false);
      }
      useUi.setState({ playhead: t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  /* keyboard — spec 16 implemented set via the single useShortcuts hook
     (SHORTCUT_MAP in lib/shortcutMap.ts is the documented twin; the cheat
     sheet renders it). F6 region cycling stays local, below. */
  useShortcuts(duration, confirm);

  /* spec 18 §6.4: "unsaved changes" browser prompt while edits are pending */
  useBeforeUnloadGuard();

  /* F6 panel-focus cycling — spec 18 §11.5 (normative).
     R23-FIX (review-sweep R5-P3#5): the F6 rung gets the §8.5 text-input
     guard + a modifier guard — pressing F6 while TYPING in a field
     (INPUT/SELECT/TEXTAREA/contentEditable) used to rip focus out from
     under the user, and browser/OS F6 chords (⌘F6 etc.) were swallowed by
     preventDefault. Plain F6 on a non-field target keeps cycling. */
  const regionsRef = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // OS/browser chords pass through
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      e.preventDefault();
      const regions = regionsRef.current.filter(Boolean) as HTMLElement[];
      if (regions.length === 0) return;
      // deepest-region match: the mixer stop (7th) is NESTED inside the
      // timeline-block stop (5th) — a plain findIndex would always match the
      // parent and F6-from-mixer would oscillate instead of cycling.
      let focusedIdx = -1;
      regions.forEach((r, i) => { if (r.contains(document.activeElement)) focusedIdx = i; });
      const next = e.shiftKey
        ? (focusedIdx <= 0 ? regions.length - 1 : focusedIdx - 1)
        : (focusedIdx === regions.length - 1 ? 0 : focusedIdx + 1);
      const el = regions[next === -1 || focusedIdx === -1 ? (e.shiftKey ? regions.length - 1 : 0) : next];
      el.focus({ preventScroll: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* R19 rail routing: a selected marker swaps the rail for the embedded
     MarkerInspector (the reference's marker DIALOG as a panel — user
     directive); a single caption-track selection swaps for the
     CaptionInspector. Both clear the other selection domain in the store.
     R20-W4b (D3): the color page's rail = the clip-level color sections
     (ColorInspectorRail — the W3 inspector grammar, store-bound to the SAME
     grade target the console edits). */
  const captionSelected = selection.length === 1
    && findElement(scenes, selection[0])?.track.kind === 'caption';
  /* R22 → R23-WB → R24-W2: the console dock view-states + the user-drag
     flags for the page-aware defaults below. colorNodesDock gates the
     CONSOLE-ROW slot [6] (the graph mounts beside/above the compact strip,
     never blocking the viewer — A2-R1); colorScopesState is 'off' | 'open'
     and gates the viewer-column pane (A2-R2). */
  const colorScopesState = useUi((s) => s.colorScopesState);
  const colorNodesDock = useUi((s) => s.colorNodesDock);

  const mainBodyUserSet = useUi((s) => s.mainBodyUserSet);
  const inspectorWUserSet = useUi((s) => s.inspectorWUserSet);
  /* R23-WB (D-B3): the density resolution — ONE store resolver shared with
     the TimelineToolbar's toggle (the honest aria-pressed law). */
  const compact = useUi((s) => resolveTimelineCompact(s));

  /* R23-WC (DESIGN-R23 D-C2, issue #99 + Part IX ruling 10 — the
     channel-selected law): a focused mixer strip (stripFocus — the mixer's
     own domain, not selectedTrackId) + NO live selection routes the right
     rail to the ChannelEditor ("if we are selecting channel then you
     should just show channel editor"). The branch yields to every live
     selection domain — marker, caption, FX-object, track — because an
     ACTIVE selection is newer intent than a carried focus; a stale
     stripFocus id (scene switch, deleted track) resolves to no audio track
     and never fires. R23-FIX (R-a): on the color/fx/audio pages the PAGE
     RAIL now outranks a carried focus too (see the rightPanel chain) —
     only the EDIT page (no page rail of its own) routes a carried
     stripFocus here. */
  const stripFocus = useUi((s) => s.stripFocus);
  const selectedFxObject = useUi((s) => s.selectedFxObject);
  const selectedTrackId = useUi((s) => s.selectedTrackId);
  const channelRailLive =
    stripFocus != null
      && selection.length === 0
      && !selectedMarkerId
      && !captionSelected
      && !selectedFxObject
      && !selectedTrackId
      && scene.tracks.some((t) => t.id === stripFocus && t.kind === 'audio');

  /* R22-D8/D2 → R23-WB (Part IX ruling 11 — the mainbody interaction law):
     the color page wants a TALL mainbody (55%) ONLY while the compact strip
     carries the timeline area; flipping to FULL TRACKS on color drops the
     default to 40% (336px of lanes vs a ~200px row at 55% would clip 60% —
     the filmstrip needs the lane room). The user's drag (mainBodyUserSet)
     always wins and persists. The FX page stays at the 40% EDIT default
     (ruling 1). R23-WF (D-F1, #107): deliver rebalances the same way —
     50% while the compact strip (with its range band head row) carries the
     timeline area ("the shorter timeline area can leave more room for
     export settings too"), 40% when full tracks are asked for (the same
     filmstrip lane-room law, deliver-shaped). */
  const mainBodyHeight = mainBodyH !== 0
    ? mainBodyH
    : page === 'color' && !mainBodyUserSet ? (compact ? '55%' : '40%')
    : page === 'deliver' && !mainBodyUserSet ? (compact ? '50%' : '40%')
    : '40%';
  const effectiveInspectorW = page === 'color' && !inspectorWUserSet ? 420 : inspectorW;
  /* R23-WA (D-A1): the FX page's right rail = the FxInspector (the param
     surface for the selected transition / fade / clip-effect-stack); the
     rail swap rides the SAME panels.inspector gate + inspectorW splitter
     as every other page. R23-WC: the D-C2 branch rides FIRST on edit (no
     page rail there), then the page rails — see the R-a chain below. */
  /* R23-FIX (review-sweep R-a, items 5/R2-F3/R5-P3-4 — the rail priority
     hoist): marker/caption branches hoist ABOVE the page branches. An
     ACTIVE selection domain is NEWER intent than the page default — the
     D-C2 philosophy applied to its own edge (the old chain buried the
     marker rail under the color/fx/audio page rails, so selecting a marker
     on those pages left the rail showing the page default while the marker
     domain held — a lying rail). New chain: selectedMarkerId →
     captionSelected → page rails (color/fx/audio) → channelRailLive →
     Inspector. channelRailLive therefore no longer yields to a carried
     stripFocus on the audio/fx/color pages (their page rails win; the audio
     page rail IS the ChannelEditor, so #99's own case is unchanged). */
  const rightPanel: ReactNode =
    selectedMarkerId ? <MarkerInspector />
    : captionSelected ? <CaptionInspector />
    : page === 'color' ? <ColorInspector />
    : page === 'fx' ? <FxInspector />
    : page === 'audio' ? <ChannelEditor />
    : channelRailLive ? <ChannelEditor />
    : <Inspector />;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app" role="application" aria-label="NLE shell study">
      <a href="#timeline-scroll" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[99] focus:rounded focus:bg-inset focus:px-2 focus:py-1 focus:text-[11px] focus:text-tprimary">
        Skip to timeline
      </a>

      <div ref={(el) => { regionsRef.current[0] = el; }} tabIndex={-1} className="shell-region">
        <Toolbar2 />
      </div>

      {/* ---- main body ----
          R19: the Deliver page repurposes the WHOLE mainbody as the export
          surface (th_mto37ba3): left queue / center summary+range / right
          settings live inside DeliverPage's own 3-region layout; the timeline
          stays live below with the loop in/out as the export range. */}
      <div
        className="mainbody flex shrink-0 overflow-hidden"
        style={{ height: mainBodyHeight, minHeight: 320 }}
      >
        {page === 'deliver' ? (
          <div ref={(el) => { regionsRef.current[1] = el; }} tabIndex={-1} className="shell-region panel-shadow flex h-full min-h-0 flex-1">
            <DeliverPage />
          </div>
        ) : (
          <>
            {/* R23-FIX (review-sweep R-c, items 11/R1-P2-2/R2-F13): the
                left-dock mount is TABLE-DRIVEN — `const dock =
                leftDockContent(page); show = !!dock && (!dock.gatedByPool
                || panels.mediaPool)`. Audio + FX OWN the slot (gatedByPool:
                false → always mounted — the Fairlight law); Edit + Color
                stay gated by the mediaPool flag; Deliver hides (null entry —
                DeliverPage owns the mainbody). The old `panels.mediaPool ||
                panels.effects` read was a dead-flag gate: with the pool off,
                the AUDIO page lost its Sound Library (a frozen surface) and
                the FX page its browser — the flag never governed those
                slots. panels.effects is now unread here (dead view state,
                README row). */}
            {(() => {
              const dock = leftDockContent(page);
              const showLeftDock = !!dock && (!dock.gatedByPool || panels.mediaPool);
              if (!showLeftDock) return null;
              return (
                <>
                  <div ref={(el) => { regionsRef.current[1] = el; }} tabIndex={-1} className="shell-region panel-shadow flex h-full min-h-0 shrink-0" style={{ width: mediaW }}>
                    <LeftDock />
                  </div>
                  <VSplitter onDrag={(dx) => setMediaW(dx === 0 ? 280 : useUi.getState().mediaW + dx)} />
                </>
              );
            })()}

            <div ref={(el) => { regionsRef.current[2] = el; }} tabIndex={-1} className="shell-region panel-shadow flex min-h-0 min-w-0 flex-1 flex-col">
              {/* R24-W2 (A2-R1, issues #67/#64 — SUPERSEDES R23-WB D-B2):
                  region [2] is ALWAYS Viewer-led — the ColorNodeGraph ⇄
                  Viewer swap is DELETED (the reviewer's "NOT here blocking
                  the preview" ruling; the graph re-homes to the console-row
                  slot [6] below and the viewer keeps publishing graded
                  frames while every console is open). A2-R2/R3: the ~160px
                  SCOPES PANE rides at the BOTTOM of this column (Viewer
                  flex-1 + the pane below), colorScopesState-gated — the
                  pane is INSIDE region [2]'s column and NEVER a new F6
                  stop (no regionsRef entry; the cycle count is unchanged). */}
              <div className="min-h-0 flex-1">
                <Viewer duration={duration} />
              </div>
              {page === 'color' && colorScopesState === 'open' && (
                <div
                  data-testid="shell-color-scopes-pane"
                  aria-label="Scopes pane"
                  className="flex h-[160px] shrink-0 border-t border-hairline"
                >
                  <ScopesDock />
                </div>
              )}
            </div>

            {/* right-docked panel: dragging the seam LEFT (dx<0) widens it.
                R22-D2: the color page defaults to the reference's 420px
                until the user drags (inspectorWUserSet). */}
            {panels.inspector && (
              <VSplitter onDrag={(dx) => setInspectorW(dx === 0 ? (page === 'color' ? 420 : 340) : useUi.getState().inspectorW - dx)} />
            )}
            {panels.inspector && (
              <div ref={(el) => { regionsRef.current[3] = el; }} tabIndex={-1} className="shell-region panel-shadow z-10 flex h-full min-h-0 shrink-0" style={{ width: effectiveInspectorW }}>
                {rightPanel}
              </div>
            )}
          </>
        )}
      </div>

      <HSplitter onDrag={(dy) => setMainBodyH(dy === 0 ? 0 : (useUi.getState().mainBodyH || window.innerHeight * 0.4) + dy)} />

      {/* ---- timeline block + console docks (design doc v2.2 §4 — the
          mixer sits SIDE BY SIDE with the multi-track lanes, not under them;
          F6 region slots [6]/[7], single-writer per index) ----
          R23-WB (D-B3): the timeline lanes resolve through the DENSITY law
          (compact → TimelineCompact, full → Timeline — compact DEFAULTS on
          color+deliver, the every-page TimelineToolbar toggle overrides per
          session, #94). R24-W2 (A2-R1): the NODE GRAPH console takes the F6
          slot [6] the ScopesDock vacated (the scopes moved UNDER the viewer,
          A2-R2) — the graph carries its own 26px nodeviewer header + 38px
          toolbar + the natural-size 706×268 scroll-both workspace; this
          wrapper takes the row's flex share (min 480px) and fills the row's
          height via flex/min-h-0 (NEVER a % height). The mixer renders only
          where its page leaves it open — entering color collapses it
          (D-B5/#92, the setPage exit law). */}
      <div ref={(el) => { regionsRef.current[4] = el; }} tabIndex={-1} className="shell-region flex min-h-0 flex-1 flex-col">
        <TimelineToolbar />
        <SceneTabs />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {compact ? (
              /* R23-FIX (R3-P3#8): the compact strip's clip click is
                 page-aware — 'grade' retargeting is the COLOR page's law;
                 every other page gets honest selection-only with a
                 'select clip' label (the old copy claimed "set grade
                 target" on pages that have no grade surface — a lying
                 label). */
              <TimelineCompact rangeBand={page === 'deliver'} clipClick={page === 'color' ? 'grade' : 'select'} />
            ) : (
              <Timeline />
            )}
          </div>
          {/* F6 region slot [6] on color = the NODE GRAPH CONSOLE (R24-W2
              A2-R1 — the slot the ScopesDock vacated when it moved under
              the viewer; single-writer per index, an off dock never leaves
              an invisible stop). The graph fills the wrapper by
              flex/min-h-0 (NEVER a % height) and takes the row's flex share
              (min 480px, owned here). */}
          {page === 'color' && colorNodesDock && (
            <div
              ref={(el) => { regionsRef.current[6] = el; }}
              tabIndex={-1}
              data-testid="shell-color-nodeviewer"
              aria-label="Node graph console"
              className="shell-region flex min-h-0 min-w-[480px] flex-1"
            >
              <ColorNodeGraph />
            </div>
          )}
          {mixerVisible && (
            <div ref={(el) => { regionsRef.current[7] = el; }} tabIndex={-1} className="shell-region flex min-h-0 shrink-0">
              <MixerDock />
            </div>
          )}
        </div>
      </div>

      <StatusStrip />
      <div ref={(el) => { regionsRef.current[5] = el; }} tabIndex={-1} className="shell-region">
        <AppDock />
      </div>

      {/* spec 18 §6.4 — notification region (fixed bottom-right, above the
          status strip; never steals focus) */}
      <ToastRegion />
    </div>
  );
}

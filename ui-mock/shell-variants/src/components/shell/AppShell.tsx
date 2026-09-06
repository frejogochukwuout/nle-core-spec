/* AppShell — spec 18 §3 layout: toolbar2 / mainbody (media pool + viewer +
   inspector) / timeline block (toolbar, scene tabs, timeline) / status strip /
   app dock. Splitters: 6px visual line / 12px interactive hit target,
   double-click resets (§3.2). Splitters OWN the seam lines — adjacent panels
   carry no borders (single-source seams, no double hairlines). Page dock
   swaps the right rail (Edit → Inspector, Color → grading stack, Deliver →
   export panel) — all at the same resizable inspectorW. */

import { useEffect, useRef, type ReactNode } from 'react';
import { useUi } from '../../state/useUiStore';
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
import { ColorInspectorRail, ColorNodeGraph, ColorScopeStrip, ColorConsole } from '../pages/ColorPage';
import { DeliverPage } from '../pages/DeliverPage';
import { ChannelEditor } from '../mixer/ChannelEditor';
import { MarkerInspector } from '../panels/MarkerInspector';
import { CaptionInspector } from '../panels/CaptionInspector';
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

  /* F6 panel-focus cycling — spec 18 §11.5 (normative) */
  const regionsRef = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return;
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
  const rightPanel: ReactNode =
    page === 'color' ? <ColorInspectorRail />
    : page === 'audio' ? <ChannelEditor />
    : selectedMarkerId ? <MarkerInspector />
    : captionSelected ? <CaptionInspector />
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
        style={{ height: mainBodyH || '40%', minHeight: 320 }}
      >
        {page === 'deliver' ? (
          <div ref={(el) => { regionsRef.current[1] = el; }} tabIndex={-1} className="shell-region panel-shadow flex h-full min-h-0 flex-1">
            <DeliverPage />
          </div>
        ) : (
          <>
            {/* R19: one LeftDock surface (th_mtoyt5fv "use the same area as
                bin") — Pool|Effects tabs in the mediaW slot; on the color page
                the slot carries the node graph (reference composition). */}
            {(panels.mediaPool || panels.effects) && (
              <div ref={(el) => { regionsRef.current[1] = el; }} tabIndex={-1} className="shell-region panel-shadow flex h-full min-h-0 shrink-0" style={{ width: mediaW }}>
                {page === 'color' ? <ColorNodeGraph /> : <LeftDock />}
              </div>
            )}
            {(panels.mediaPool || panels.effects) && (
              <VSplitter onDrag={(dx) => setMediaW(dx === 0 ? 280 : useUi.getState().mediaW + dx)} />
            )}

            <div ref={(el) => { regionsRef.current[2] = el; }} tabIndex={-1} className="shell-region panel-shadow flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                <Viewer duration={duration} />
              </div>
              {/* R20-W4b color composition: the scope strip slot under the
                  viewer — ColorScopeStrip (C53 placeholder; W4c fills the
                  real traces through useScopeSource). Never a console tab —
                  the simultaneity law (color-layout §2.1e). */}
              {page === 'color' && <ColorScopeStrip />}
            </div>

            {/* right-docked panel: dragging the seam LEFT (dx<0) widens it */}
            {panels.inspector && (
              <VSplitter onDrag={(dx) => setInspectorW(dx === 0 ? 340 : useUi.getState().inspectorW - dx)} />
            )}
            {panels.inspector && (
              <div ref={(el) => { regionsRef.current[3] = el; }} tabIndex={-1} className="shell-region panel-shadow z-10 flex h-full min-h-0 shrink-0" style={{ width: inspectorW }}>
                {rightPanel}
              </div>
            )}
          </>
        )}
      </div>

      <HSplitter onDrag={(dy) => setMainBodyH(dy === 0 ? 0 : (useUi.getState().mainBodyH || window.innerHeight * 0.4) + dy)} />

      {/* ---- timeline block + mixer dock (design doc v2.2 §4 — the mixer
          sits SIDE BY SIDE with the multi-track lanes, not under them;
          7th F6 region) ----
          R20-W4b (DESIGN-R20 D3, C51): on the COLOR page the timeline lanes
          are REPLACED by the ColorConsole (frozen lane strip + tabs + body —
          the Mixer-Console precedent). The console takes the mixer dock's
          F6 7th-region slot (region-cycle parity; the mixer does not render
          in color mode per color-layout §2.4). The Edit page keeps the full
          Timeline. */}
      <div ref={(el) => { regionsRef.current[4] = el; }} tabIndex={-1} className="shell-region flex min-h-0 flex-1 flex-col">
        <TimelineToolbar />
        <SceneTabs />
        <div className="flex min-h-0 flex-1">
          {page === 'color' ? (
            <div ref={(el) => { regionsRef.current[6] = el; }} tabIndex={-1} className="shell-region flex min-h-0 flex-1 flex-col">
              <ColorConsole />
            </div>
          ) : (
            <Timeline />
          )}
          {/* F6 region 7 (spec 18 §11.5 amendment): only a focus stop while
              the dock is actually visible — a collapsed dock must not leave
              an invisible zero-width F6 stop in the cycle. Color mode is
              excluded (the console owns the slot above). */}
          {mixerVisible && page !== 'color' && (
            <div ref={(el) => { regionsRef.current[6] = el; }} tabIndex={-1} className="shell-region flex min-h-0 shrink-0">
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

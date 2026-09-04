/* AppShell — spec 18 §3 layout: toolbar2 / mainbody (media pool + viewer +
   inspector) / timeline block (toolbar, scene tabs, timeline) / status strip /
   app dock. Splitters: 6px visual line / 12px interactive hit target,
   double-click resets (§3.2). Splitters OWN the seam lines — adjacent panels
   carry no borders (single-source seams, no double hairlines). Page dock
   swaps the right rail (Edit → Inspector, Color → grading stack, Deliver →
   export panel) — all at the same resizable inspectorW. */

import { useEffect, useRef, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { Toolbar2 } from './Toolbar2';
import { MixerDock } from '../mixer/MixerDock';
import { MediaPool } from './MediaPool';
import { Viewer } from './Viewer';
import { Inspector } from './Inspector';
import { StatusStrip } from './StatusStrip';
import { AppDock } from './AppDock';
import { TimelineToolbar } from '../timeline/TimelineToolbar';
import { SceneTabs } from '../timeline/SceneTabs';
import { Timeline } from '../timeline/Timeline';
import { ColorPage } from '../pages/ColorPage';
import { DeliverPage } from '../pages/DeliverPage';
import { ChannelEditor } from '../mixer/ChannelEditor';
import { SoundLibrary } from '../mixer/SoundLibrary';
import { sceneDuration } from '../../lib/mockData';
import { useShortcuts } from '../../hooks/useShortcuts';
import { ToastRegion } from './ToastRegion';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

/* ---------- effects library (compact mock of the Effects toggle §4.1) ---------- */
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

function EffectsPanel() {
  return (
    <div data-testid="shell-effects" className="flex h-full min-h-0 w-[220px] shrink-0 flex-col bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[11px] font-semibold text-tprimary">Effects</span>
      </div>
      <div className="scroll-y min-h-0 flex-1 p-1.5">
        {['Blur', 'Stylize', 'Transition'].map((cat) => (
          <div key={cat} className="mb-2">
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-tfaint">{cat}</div>
            {EFFECTS.filter((e) => e.cat === cat).map((e) => (
              <div key={e.name} className="cursor-grab rounded-[var(--radius)] border border-transparent px-2 py-1.5 text-[11px] text-tmuted hover:border-soft hover:bg-[var(--hover-overlay)] hover:text-tprimary">
                {e.name}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- splitters (§3.2: 6px visual line, 12px hit target, dbl-click resets) ---------- */
const SPLIT_HIT = 12; // §3.2: 12px interactive hit; visual line is the 6px --split-visual token

function VSplitter({ onDrag }: { onDrag: (dx: number) => void }) {
  const start = useRef(0);
  const keyStep = (dir: 1 | -1) => onDrag(dir * 8); // §11 a11y floor: separator is keyboard-operable (arrows = 8px steps)
  return (
    <div
      className="group relative z-10 flex shrink-0 cursor-col-resize items-center justify-center bg-app"
      style={{ width: SPLIT_HIT }}
      onDoubleClick={() => onDrag(0)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); keyStep(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); keyStep(1); }
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
  const keyStep = (dir: 1 | -1) => onDrag(dir * 8); // arrows = 8px steps
  return (
    <div
      className="group relative z-10 flex shrink-0 cursor-row-resize items-center justify-center bg-app"
      style={{ height: SPLIT_HIT }}
      onDoubleClick={() => onDrag(0)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); keyStep(-1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); keyStep(1); }
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

  const rightPanel: ReactNode =
    page === 'color' ? <ColorPage />
    : page === 'deliver' ? <DeliverPage />
    : page === 'audio' ? <ChannelEditor />
    : <Inspector />;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app" role="application" aria-label="NLE shell study">
      <a href="#timeline-scroll" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[99] focus:rounded focus:bg-inset focus:px-2 focus:py-1 focus:text-[11px] focus:text-tprimary">
        Skip to timeline
      </a>

      <div ref={(el) => { regionsRef.current[0] = el; }} tabIndex={-1} className="shell-region">
        <Toolbar2 />
      </div>

      {/* ---- main body ---- */}
      <div
        className="mainbody flex shrink-0 overflow-hidden"
        style={{ height: mainBodyH || '40%', minHeight: 320 }}
      >
        {panels.mediaPool && (
          <div ref={(el) => { regionsRef.current[1] = el; }} tabIndex={-1} className="shell-region panel-shadow flex h-full min-h-0 shrink-0" style={{ width: mediaW }}>
            {page === 'audio' ? <SoundLibrary /> : <MediaPool />}
          </div>
        )}
        {panels.mediaPool && (
          <VSplitter onDrag={(dx) => setMediaW(dx === 0 ? 280 : useUi.getState().mediaW + dx)} />
        )}
        {panels.effects && <EffectsPanel />}

        <div ref={(el) => { regionsRef.current[2] = el; }} tabIndex={-1} className="shell-region panel-shadow flex min-h-0 min-w-0 flex-1">
          <Viewer duration={duration} />
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
      </div>

      <HSplitter onDrag={(dy) => setMainBodyH(dy === 0 ? 0 : (useUi.getState().mainBodyH || window.innerHeight * 0.4) + dy)} />

      {/* ---- timeline block + mixer dock (design doc v2.2 §4 — the mixer
          sits SIDE BY SIDE with the multi-track lanes, not under them;
          7th F6 region) ---- */}
      <div ref={(el) => { regionsRef.current[4] = el; }} tabIndex={-1} className="shell-region flex min-h-0 flex-1 flex-col">
        <TimelineToolbar />
        <SceneTabs />
        <div className="flex min-h-0 flex-1">
          <Timeline />
          {/* F6 region 7 (spec 18 §11.5 amendment): only a focus stop while
              the dock is actually visible — a collapsed dock must not leave
              an invisible zero-width F6 stop in the cycle */}
          {mixerVisible && (
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

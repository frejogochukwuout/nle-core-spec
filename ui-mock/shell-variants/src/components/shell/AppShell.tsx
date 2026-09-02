/* AppShell — spec 18 §3 layout: toolbar2 / mainbody (media pool + viewer +
   inspector) / timeline block (toolbar, scene tabs, timeline) / status strip /
   app dock. Splitters: 6px visual / 12px interactive, double-click resets
   (§3.2). Page dock swaps the right rail (Edit → Inspector, Color → grading
   stack, Deliver → export panel). */

import { useEffect, useRef, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { Toolbar2 } from './Toolbar2';
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
import { sceneDuration } from '../../lib/mockData';

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
    <div data-testid="shell-effects" className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-hairline bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[11.5px] font-semibold text-tprimary">Effects</span>
      </div>
      <div className="scroll-y min-h-0 flex-1 p-1.5">
        {['Blur', 'Stylize', 'Transition'].map((cat) => (
          <div key={cat} className="mb-2">
            <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-tfaint">{cat}</div>
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

/* ---------- splitters (§3.2: 6px visual, 12px hit, dbl-click resets) ---------- */
function VSplitter({ onDrag }: { onDrag: (dx: number) => void }) {
  const start = useRef(0);
  return (
    <div
      className="group relative z-10 flex w-[6px] shrink-0 cursor-col-resize items-center justify-center"
      onDoubleClick={() => onDrag(0)}
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
    >
      <div className="h-[90%] w-px bg-hairline transition-colors group-hover:bg-accent" />
    </div>
  );
}

function HSplitter({ onDrag }: { onDrag: (dy: number) => void }) {
  const start = useRef(0);
  return (
    <div
      className="group relative z-10 flex h-[6px] shrink-0 cursor-row-resize items-center justify-center border-y border-hairline bg-shell"
      onDoubleClick={() => onDrag(0)}
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
    >
      <div className="h-px w-[100%] transition-colors group-hover:bg-accent" />
    </div>
  );
}

/* ---------- shell ---------- */
export function AppShell() {
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
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];
  const duration = sceneDuration(scene);

  /* playback loop (rAF; mock "engine") */
  const playing = useUi((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = useUi.getState();
      let t = s.playhead + dt;
      if (s.loopEnabled && t >= s.loop.end) t = s.loop.start;
      if (t >= duration) {
        t = duration;
        useUi.getState().setPlaying(false);
      }
      useUi.setState({ playhead: t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  /* keyboard (spec 16 core set — skip when typing) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const s = useUi.getState();
      switch (e.key) {
        case ' ': e.preventDefault(); s.togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); s.nudgePlayhead(e.shiftKey ? -10 : -1); break;
        case 'ArrowRight': e.preventDefault(); s.nudgePlayhead(e.shiftKey ? 10 : 1); break;
        case 'Home': s.setPlayhead(0); break;
        case 'End': s.setPlayhead(duration); break;        case 'PageUp': case 'PageDown': {
          e.preventDefault();
          const main = scene.tracks.find((tr) => tr.kind === 'main');
          const edges = (main?.elements ?? []).flatMap((el) => [el.startTime, el.startTime + el.duration]).sort((a, b) => a - b);
          const dir = e.key === 'PageDown' ? 1 : -1;
          const next = edges.find((x) => (dir === 1 ? x > s.playhead + 0.01 : x < s.playhead - 0.01));
          if (next !== undefined) s.setPlayhead(dir === 1 ? next + 0.01 : Math.max(0, next - 0.01));
          break;
        }
        case 'i': case 'I': s.markIn(); break;
        case 'o': case 'O': s.markOut(); break;
        case 'm': s.addMarker(s.playhead); break;
        case 'v': case 'V': s.setTool('select'); break;
        case 'b': case 'B': s.setTool('blade'); break;
        case 't': case 'T': s.setTool('roll'); break;
        case 'y': case 'Y': s.setTool('slip'); break;
        case 'u': case 'U': s.setTool('slide'); break;
        case 'r': case 'R': s.setTool('ripple'); break;
        case 'n': case 'N': s.toggleSnap(); break;
        case '?': s.setCheatOpen(!s.cheatOpen); break;
        case 'Escape': s.setSelection([]); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, scene]);

  /* F6 panel-focus cycling — spec 18 §11.5 (normative) */
  const regionsRef = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return;
      e.preventDefault();
      const regions = regionsRef.current.filter(Boolean) as HTMLElement[];
      if (regions.length === 0) return;
      const focusedIdx = regions.findIndex((r) => r.contains(document.activeElement));
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
    page === 'color' ? <div className="flex h-full min-h-0 w-[340px] shrink-0"><ColorPage /></div>
    : page === 'deliver' ? <div className="flex h-full min-h-0 w-[340px] shrink-0"><DeliverPage /></div>
    : <Inspector />;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-shell" role="application" aria-label="NLE shell study">
      <a href="#timeline-scroll" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[99] focus:rounded focus:bg-inset focus:px-2 focus:py-1 focus:text-[11px] focus:text-tprimary">
        Skip to timeline
      </a>

      <div ref={(el) => { regionsRef.current[0] = el; }} tabIndex={-1} className="shell-region">
        <Toolbar2 />
      </div>

      {/* ---- main body ---- */}
      <div
        className="flex shrink-0 overflow-hidden border-b border-hairline"
        style={{ height: mainBodyH || '40%', minHeight: 320 }}
      >
        {panels.mediaPool && (
          <div ref={(el) => { regionsRef.current[1] = el; }} tabIndex={-1} className="shell-region flex h-full min-h-0 shrink-0" style={{ width: mediaW }}>
            <MediaPool />
          </div>
        )}
        {panels.mediaPool && (
          <VSplitter onDrag={(dx) => setMediaW(dx === 0 ? 280 : useUi.getState().mediaW + dx)} />
        )}
        {panels.effects && <EffectsPanel />}

        <div ref={(el) => { regionsRef.current[2] = el; }} tabIndex={-1} className="shell-region flex min-h-0 min-w-0 flex-1">
          <Viewer duration={duration} />
        </div>

        {panels.inspector && (
          <VSplitter onDrag={(dx) => setInspectorW(dx === 0 ? 340 : useUi.getState().inspectorW + dx)} />
        )}
        {panels.inspector && (
          <div ref={(el) => { regionsRef.current[3] = el; }} tabIndex={-1} className="shell-region panel-shadow z-10 flex h-full min-h-0 shrink-0" style={{ width: inspectorW }}>
            {rightPanel}
          </div>
        )}
      </div>

      <HSplitter onDrag={(dy) => setMainBodyH(dy === 0 ? 0 : (useUi.getState().mainBodyH || window.innerHeight * 0.4) + dy)} />

      {/* ---- timeline block ---- */}
      <div ref={(el) => { regionsRef.current[4] = el; }} tabIndex={-1} className="shell-region flex min-h-0 flex-1 flex-col">
        <TimelineToolbar />
        <SceneTabs />
        <Timeline />
      </div>

      <StatusStrip />
      <div ref={(el) => { regionsRef.current[5] = el; }} tabIndex={-1} className="shell-region">
        <AppDock />
      </div>
    </div>
  );
}

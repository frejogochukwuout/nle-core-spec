/* ColorNodeGraph — the left-dock grading surface (R19-B4 reference rebuild,
   color-cluster §3). R20-W4b (gap C56): node selection is now HONEST and
   STORE-DRIVEN — exactly ONE selected node lives in the store's
   selectedColorNodeId (view state):
     · Primary 01 binds to the target's GradeParams (the primaries surface) —
       selecting it routes the console to the Primaries tab;
     · Secondary 02 binds to GradeParams.qualifier (the secondary node) —
       selecting it routes the console to the Qualifier tab;
     · every other node kind (corrector/parallel/fx/master) renders but is
       display state — the first such selection fires ONE honest toast
       ('node graphs land with C56'); never a silent fake binding.
   The console header shows the node chip (which surface is being edited).
   Topology/anatomy unchanged: 38px toolbar (arrow/hand tools, page dots,
   Clip chip, zoom look, …), 64px grid workspace, 106×86 cards, ports/edges
   exactly as before. */

import { useState } from 'react';
import { Hand, Layers, MousePointer2 } from 'lucide-react';
import { useHonestToast } from './useHonestToast';
import { useUi } from '../../../state/useUiStore';

/* ---------- geometry (color-cluster.md §3.4) ---------- */

const CARD_W = 106;
const CARD_H = 86; // 60 thumb + 24 footer + 2 borders
const TITLE_H = 18;
const PORT = 7;
const TOP_PORT = 18; // upper edge of thumbnail
const BOT_PORT = 48; // thumbnail bottom edge
const CANVAS_W = 706; // the mock layout's true extent (master-out x=596 + card ~110)
const CANVAS_H = 268;

type NodeKind = 'master' | 'grade' | 'fx' | 'mixer';
type ThumbKind = 'image' | 'blur' | 'bright' | 'mask' | 'none';
type BarKind = 'full' | 'partial' | 'none';
type FooterIcons = 'bars4' | 'circle' | 'bars3wand' | 'fx' | 'none';

interface NodeDef {
  id: string;
  title: string;
  kind: NodeKind;
  num?: string;
  x: number;
  y: number;
  thumb: ThumbKind;
  bar: BarKind;
  icons: FooterIcons;
  /** Primary's non-selected #777 emphasis (ref .highlight-border) */
  highlight?: boolean;
}

const NODES: NodeDef[] = [
  { id: 'master-in', title: 'Master Input', kind: 'master', x: 14, y: 120, thumb: 'none', bar: 'none', icons: 'none' },
  { id: 'primary', title: 'Primary', kind: 'grade', x: 60, y: 80, num: '01', thumb: 'image', bar: 'full', icons: 'bars4', highlight: true },
  { id: 'secondary', title: 'Secondary', kind: 'grade', x: 182, y: 12, num: '02', thumb: 'image', bar: 'partial', icons: 'circle' },
  { id: 'water', title: 'Water', kind: 'grade', x: 182, y: 140, num: '03', thumb: 'mask', bar: 'partial', icons: 'bars3wand' },
  { id: 'mixer', title: 'Mixer', kind: 'mixer', x: 302, y: 110, thumb: 'none', bar: 'none', icons: 'none' },
  { id: 'tilt', title: 'Tilt Shift', kind: 'fx', x: 356, y: 80, num: '05', thumb: 'blur', bar: 'full', icons: 'fx' },
  { id: 'lens', title: 'Lens Flare', kind: 'fx', x: 474, y: 80, num: '06', thumb: 'bright', bar: 'full', icons: 'fx' },
  { id: 'master-out', title: 'Master Output', kind: 'master', x: 596, y: 120, thumb: 'none', bar: 'none', icons: 'none' },
];

const nodeById = (id: string) => NODES.find((n) => n.id === id)!;
const hasTitle = (n: NodeDef) => n.kind === 'grade' || n.kind === 'fx';
const cardW = (n: NodeDef) => (n.kind === 'master' ? 16 : n.kind === 'mixer' ? 32 : CARD_W);

/** port center in canvas coords (square ports; blue input triangle gets the
    reference's +3px visual-center compensation) */
function portXY(n: NodeDef, port: string): { x: number; y: number } {
  const top = hasTitle(n) ? n.y + TITLE_H : n.y;
  const left = n.x;
  const w = cardW(n);
  switch (port) {
    case 'in-g':
      return { x: left - 0.5, y: top + TOP_PORT + PORT / 2 };
    case 'in-b':
      return { x: left + 1, y: top + BOT_PORT + 4 };
    case 'out-g':
      return { x: left + w + 0.5, y: top + TOP_PORT + PORT / 2 };
    case 'out-b':
      return { x: left + w + 0.5, y: top + BOT_PORT + PORT / 2 };
    /* master minis: single green port at top 12px */
    case 'mini-out':
      return { x: left + w + 0.5, y: n.y + 12 + PORT / 2 };
    case 'mini-in':
      return { x: left - 0.5, y: n.y + 12 + PORT / 2 };
    /* mixer: 2 green inputs at top 14/34, 1 green output at top 24 */
    case 'mix-in-1':
      return { x: left - 0.5, y: n.y + 14 + PORT / 2 };
    case 'mix-in-2':
      return { x: left - 0.5, y: n.y + 34 + PORT / 2 };
    case 'mix-out':
      return { x: left + w + 0.5, y: n.y + 24 + PORT / 2 };
    default:
      return { x: left, y: top };
  }
}

/* the 8 edges (ref §3.6) — straight 2px lines between port centers */
const EDGES: { from: [string, string]; to: [string, string] }[] = [
  { from: ['master-in', 'mini-out'], to: ['primary', 'in-g'] },
  { from: ['primary', 'out-g'], to: ['secondary', 'in-g'] },
  { from: ['primary', 'out-g'], to: ['water', 'in-g'] },
  { from: ['secondary', 'out-g'], to: ['mixer', 'mix-in-1'] },
  { from: ['water', 'out-g'], to: ['mixer', 'mix-in-2'] },
  { from: ['mixer', 'mix-out'], to: ['tilt', 'in-g'] },
  { from: ['tilt', 'out-g'], to: ['lens', 'in-g'] },
  { from: ['lens', 'out-g'], to: ['master-out', 'mini-in'] },
];

/* ---------- node sub-parts ---------- */

/** deterministic inline-SVG "Venice" plate — the reference hotlinks unsplash
    thumbnails (plain / blur=2 / brightness=150 per node); we render a local
    scene with the same per-node filters so no network is needed. */
function Thumb({ n }: { n: NodeDef }) {
  if (n.thumb === 'mask') {
    /* Water: gray plate + cyan mask squiggle (ref §3.5) */
    return (
      <div className="relative h-full w-full" style={{ background: '#8c8c8c' }}>
        <svg viewBox="0 0 60 20" preserveAspectRatio="none" className="absolute bottom-[5px] right-0 h-[20px] w-[60px]" aria-hidden>
          <path d="M0,18 Q15,10 30,16 T60,5" fill="none" stroke="#00d8ff" strokeWidth="2" />
        </svg>
      </div>
    );
  }
  const filter = n.thumb === 'blur' ? 'blur(1.5px)' : n.thumb === 'bright' ? 'brightness(1.5) saturate(1.25)' : undefined;
  return (
    <svg viewBox="0 0 106 60" preserveAspectRatio="xMidYMid slice" className="h-full w-full" style={{ filter }} aria-hidden>
      <defs>
        <linearGradient id={`ng-sky-${n.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d9cc4" />
          <stop offset="0.55" stopColor="#c9b091" />
          <stop offset="0.56" stopColor="#31435a" />
          <stop offset="1" stopColor="#1d2a3a" />
        </linearGradient>
      </defs>
      <rect width="106" height="60" fill={`url(#ng-sky-${n.id})`} />
      <circle cx="78" cy="10" r="4" fill="#f4e3c1" opacity="0.9" />
      <path
        d="M0 34 h8 v-6 h5 v6 h6 v-9 h6 v9 h5 v-5 h7 v5 h8 v-11 h5 v11 h6 v-7 h6 v7 h9 v-4 h6 v4 h7 v-9 h5 v9 h8 v-6 h7 v6 h6 v-3 h10 v3 h6 V60 H0 Z"
        fill="#232733"
        opacity="0.92"
      />
      <rect x="76" y="36" width="4" height="20" fill="#e8d5a8" opacity="0.25" />
      <rect x="70" y="38" width="3" height="16" fill="#e8d5a8" opacity="0.18" />
      <rect x="84" y="40" width="3" height="14" fill="#e8d5a8" opacity="0.18" />
    </svg>
  );
}

/** 7×7 square port / blue right-triangle input (ref §3.4) */
function Port({ kind, side, top }: { kind: 'green' | 'blue' | 'blueIn'; side: 'left' | 'right'; top: number }) {
  const pos = side === 'left' ? { left: -4 } : { right: -4 };
  if (kind === 'blueIn') {
    return (
      <span
        aria-hidden
        className="absolute z-[3] h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent"
        style={{ ...pos, top, left: side === 'left' ? -5 : undefined, right: side === 'right' ? -5 : undefined, borderLeftColor: 'var(--port-blue)', filter: 'drop-shadow(-1px 0 1px #111)' }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="absolute z-[3] h-[7px] w-[7px] border border-[#111]"
      style={{ ...pos, top, background: kind === 'green' ? 'var(--port-green)' : 'var(--port-blue)' }}
    />
  );
}

/** footer glyphs — the reference's 12px data icons (exact paths, ref §3.5) */
function FooterIcons({ kind }: { kind: FooterIcons }) {
  if (kind === 'fx') {
    return <span className="ml-auto font-serif text-[11px] font-bold italic" style={{ color: '#aaa' }}>fx</span>;
  }
  if (kind === 'none') return null;
  return (
    <span className="ml-auto flex items-center gap-1" style={{ color: '#999' }}>
      {kind === 'bars4' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 22h2V9H4v13zm6 0h2V5h-2v17zm6 0h2V13h-2v9zm6 0h2v-5h-2v5z" />
        </svg>
      )}
      {(kind === 'circle' || kind === 'bars3wand') && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )}
      {kind === 'bars3wand' && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-[2px]">
            <path d="M4 22h2V9H4v13zm6 0h2V5h-2v17zm6 0h2V13h-2v9z" />
          </svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-[2px]">
            <path d="M7.5 17.5L2 22l2.5-5.5L16 5l3 3-11.5 11.5z" />
            <path d="M19 2l-2 2 3 3 2-2-3-3z" />
          </svg>
        </>
      )}
    </span>
  );
}

/* ---------- node card by kind ---------- */

function NodeCard({ n, selected }: { n: NodeDef; selected: boolean }) {
  const border = selected ? 'var(--danger)' : n.highlight && !selected ? '#777' : 'var(--node-border)';
  const shadow = selected
    ? '0 0 0 1px var(--danger), 0 4px 12px rgba(0,0,0,0.4)'
    : '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';

  if (n.kind === 'master') {
    /* 16×32 mini node w/ centered dot; green port at top 12 (in or out) */
    return (
      <div className="relative rounded-[4px]" style={{ width: 16, height: 32, background: '#3b3c42', border: '1px solid #1a1a1f', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
        <span aria-hidden className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: '#5c5d63' }} />
        {n.id === 'master-in' ? <Port kind="green" side="right" top={12} /> : <Port kind="green" side="left" top={12} />}
      </div>
    );
  }

  if (n.kind === 'mixer') {
    /* 32×54 merge node: layers glyph, 2 green in-ports, 1 green out-port */
    return (
      <div className="relative rounded-[4px]" style={{ width: 32, height: 54, background: '#2f3036', border: '1px solid #1a1a1f', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
        <Layers size={16} strokeWidth={2} aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#999' }} />
        <Port kind="green" side="left" top={14} />
        <Port kind="green" side="left" top={34} />
        <Port kind="green" side="right" top={24} />
      </div>
    );
  }

  /* grade / fx card: 106×86 — thumbnail 60 + footer 24 */
  return (
    <div className="relative rounded-[6px]" style={{ width: CARD_W, background: 'var(--node-bg)', border: `1px solid ${border}`, boxShadow: shadow }}>
      <Port kind="green" side="left" top={TOP_PORT} />
      <Port kind="blueIn" side="left" top={BOT_PORT} />
      <Port kind="green" side="right" top={TOP_PORT} />
      <Port kind="blue" side="right" top={BOT_PORT} />
      <div className="relative overflow-hidden rounded-t-[5px]" style={{ height: 60, background: '#111' }}>
        <Thumb n={n} />
        {/* connected-clip badge: 2px --port-blue bar (full / 40% partial) */}
        {n.bar !== 'none' && (
          <span aria-hidden className="absolute bottom-0 left-0 h-[2px]" style={{ width: n.bar === 'full' ? '100%' : '40%', background: 'var(--port-blue)' }} />
        )}
      </div>
      <div className="flex h-[24px] items-center gap-1.5 rounded-b-[5px] border-t border-[#1a1a1f] px-2" style={{ background: 'var(--node-footer)' }}>
        {n.num && <span className="text-[11px] font-semibold text-white">{n.num}</span>}
        <FooterIcons kind={n.icons} />
      </div>
    </div>
  );
}

/* the two HONEST bindings (C56): node id → the console surface it owns. */
const NODE_BINDINGS: Record<string, 'primaries' | 'qualifier'> = {
  primary: 'primaries',
  secondary: 'qualifier',
};

/* ---------- the graph ---------- */

export interface ColorNodeGraphProps {
  /** R22-D4: when true the graph renders DOCKED inside the NodeGraphDock —
   *  the dock owns the toolbar chrome and this component renders ONLY the
   *  workspace (scrollable at natural size; the dock clips — the #74 fix).
   *  Standalone (stories/solo mounts) keeps its own 38px toolbar. */
  docked?: boolean;
}

export function ColorNodeGraph({ docked = false }: ColorNodeGraphProps) {
  /* honest one-shot toasts: (a) the mock-only graph controls (clip picker,
     page dots, overflow menu; hand tool = gesture deferral), (b) the C56
     deferral — non-bound node kinds are display state. */
  const tell = useHonestToast('Node graph', 'node graph controls are display state — drag / pan / zoom land in the interaction round (R19-TODO)');
  const tellUnbound = useHonestToast('Node graph', 'node graphs land with C56 — only the Primaries and Qualifier nodes bind today');
  const selected = useUi((s) => s.selectedColorNodeId);
  const setColorNode = useUi((s) => s.setColorNode);
  const setColorInspectorTab = useUi((s) => s.setColorInspectorTab);
  const [tool, setTool] = useState<'arrow' | 'hand'>('arrow');
  const [page, setPage] = useState(1);

  const clickNode = (id: string) => {
    if (selected === id) {
      setColorNode(null); // toggle off (the old exactly-one law)
      return;
    }
    setColorNode(id);
    const binding = NODE_BINDINGS[id];
    if (binding) setColorInspectorTab(binding); // honest routing — no fake binding
    else tellUnbound(); // corrector/parallel/fx/master: display state, C56
  };

  const workspace = (
    <div className="min-h-0 flex-1 overflow-auto" style={{ background: 'var(--nodegraph-bg)' }}>
      <div
        className="relative"
        style={{
          /* EXPLICIT extents: the nodes/edges are absolutely positioned (out
             of flow — they never extend a scroll region). The canvas box
             itself carries the extents so the dock/standalone scroll shows
             the whole graph (R22-D4: scrollable at natural size). */
          width: CANVAS_W,
          height: CANVAS_H,
          backgroundColor: 'var(--nodegraph-bg)',
          backgroundImage: 'linear-gradient(var(--nodegraph-grid) 1px, transparent 1px), linear-gradient(90deg, var(--nodegraph-grid) 1px, transparent 1px)',
          backgroundSize: '64px 64px, 64px 64px',
          backgroundPosition: '-32px -32px, -32px -32px',
        }}
      >
        {/* edges — straight 2px lines from port centers (z-1 under nodes) */}
        <svg width={CANVAS_W} height={CANVAS_H} className="pointer-events-none absolute left-0 top-0 z-[1]" aria-hidden>
          {EDGES.map(({ from, to }) => {
            const a = portXY(nodeById(from[0]), from[1]);
            const b = portXY(nodeById(to[0]), to[1]);
            return <line key={`${from.join('-')}-${to.join('-')}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--node-edge)" strokeWidth="2" />;
          })}
        </svg>

        {/* nodes — focusable buttons; click toggles selection (ONE max) */}
        {NODES.map((n) => {
          const isSel = n.id === selected;
          return (
            <button
              key={n.id}
              type="button"
              data-testid={`shell-color-node-${n.id}`}
              aria-pressed={isSel}
              aria-label={`${n.title} node${n.num ? ` ${n.num}` : ''}`}
              onClick={() => clickNode(n.id)}
              className="absolute z-[2] flex flex-col items-center"
              style={{ left: n.x, top: n.y, width: cardW(n) }}
            >
              {hasTitle(n) && (
                <span className="mb-[6px] whitespace-nowrap text-[12px] font-medium text-tprimary" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {n.title}
                </span>
              )}
              <NodeCard n={n} selected={isSel} />
            </button>
          );
        })}
      </div>
    </div>
  );

  /* R22-D4: docked = the NodeGraphDock owns the chrome; this renders ONLY the
     workspace (scrollable at natural size; the dock clips — the #74 fix). */
  if (docked) {
    return (
      <div data-testid="shell-color-nodegraph" className="flex h-full min-h-0 w-full flex-col" style={{ background: 'var(--nodegraph-bg)' }}>
        {workspace}
      </div>
    );
  }

  return (
    <div data-testid="shell-color-nodegraph" className="flex h-full min-h-0 w-full min-w-[400px] flex-col" style={{ background: 'var(--nodegraph-bg)' }}>
      {/* 38px toolbar (ref §3.2) */}
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-4" style={{ color: '#b0b0b0' }}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Arrow tool"
            aria-pressed={tool === 'arrow'}
            className="flex h-[38px] w-[26px] items-center justify-center transition-colors hover:text-white"
            style={{ color: tool === 'arrow' ? '#fff' : undefined }}
            onClick={() => setTool('arrow')}
          >
            <MousePointer2 size={16} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label="Hand tool"
            aria-pressed={tool === 'hand'}
            data-testid="shell-color-nodegraph-hand"
            className="flex h-[38px] w-[26px] items-center justify-center transition-colors hover:text-white"
            style={{ color: tool === 'hand' ? '#fff' : undefined }}
            onClick={() => {
              setTool('hand');
              tell(); // honest: pan is a gesture-round deferral, not a silent no-op
            }}
          >
            <Hand size={16} fill="currentColor" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2].map((p) => (
            <button
              key={p}
              type="button"
              aria-label={`Node page ${p}`}
              aria-pressed={page === p}
              className="h-[6px] w-[6px] rounded-full transition-colors"
              style={{ background: page === p ? '#fff' : '#444' }}
              onClick={() => {
                if (p !== page) {
                  setPage(p);
                  tell(); // single page in the mock — honest, not silent
                }
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          {/* Clip chip — dropdown-ish (display state, honest toast) */}
          <button
            type="button"
            aria-label="Clip selector"
            data-testid="shell-color-nodegraph-clip"
            className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:text-white"
            onClick={tell}
          >
            Clip
            <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden>
              <path d="M1 1L5 5L9 1" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          {/* 60px zoom slider LOOK — static (aria-hidden: no control promised) */}
          <div aria-hidden className="relative h-[2px] w-[60px] rounded-[1px]" style={{ background: '#444' }}>
            <span className="absolute left-1/2 top-1/2 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: '#888' }} />
          </div>
          <button
            type="button"
            aria-label="Node graph menu"
            className="pb-1 text-[14px] tracking-[2px] transition-colors hover:text-white"
            onClick={tell}
          >
            ...
          </button>
        </div>
      </div>
      {workspace}
    </div>
  );
}

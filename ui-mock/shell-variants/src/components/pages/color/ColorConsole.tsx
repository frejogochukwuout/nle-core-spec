/* ColorConsole — R20-W4b (DESIGN-R20 D3 / gap C51; the timeline-area grading
   surface, the Mixer-Console precedent). When page === 'color' the TIMELINE
   AREA becomes this console (AppShell swaps <Timeline/> for it; the Edit page
   keeps the full Timeline):

   ┌ frozen lane strip ── ruler 22px · video lanes 24px · audio lanes 16px
   │   dimmed (read-only mini lanes; clips are CLICKABLE = grade target +
   │   selection; NO trim/drag/resize gestures — the handles never render)
   ├ tab bar ── [Primaries | Curves | Qualifier] compact text tabs
   │   (timeline_edit_modes tab-nav style, tablist semantics + arrow roving)
   │   + node chip (C56: which surface the console edits) + the
   │   Clip ⇄ Timeline grade-target toggle (single owner of the timeline
   │   grade — the Project sheet never edits it)
   └ body ── the active tab's panel (Wheels / Curves / Qualifier), internal
       scroll at small heights (registered in README)

   Every panel is STORE-DRIVEN through useGradeRecord (mockGrades sidecar,
   gap C50) — console and right rail resolve the SAME target id from the
   store, so they can never disagree. */

import { type KeyboardEvent } from 'react';
import { useUi, useActiveScene, resolveGradeTargetId, TIMELINE_GRADE_KEY } from '../../../state/useUiStore';
import { getRulerConfig, formatRulerLabel, shouldShowLabel } from '../../../lib/rulerTiers';
import { WheelsPanel } from './WheelsPanel';
import { CurvesPanel } from './CurvesPanel';
import { QualifierPanel } from './QualifierPanel';
import { gradeTargetLabel } from './useGradeTarget';

/* ---------- lane strip geometry (C51 compact set) ---------- */

const RULER_H = 22;
const VIDEO_H = 24;
const AUDIO_H = 16;
const BADGE_W = 30;

const laneH = (kind: 'overlay' | 'main' | 'audio' | 'caption') => (kind === 'audio' ? AUDIO_H : VIDEO_H);

/* ---------- tabs ---------- */

type ConsoleTab = 'primaries' | 'curves' | 'qualifier';

const TABS: { id: ConsoleTab; label: string }[] = [
  { id: 'primaries', label: 'Primaries' },
  { id: 'curves', label: 'Curves' },
  { id: 'qualifier', label: 'Qualifier' },
];

const NODE_CHIP: Record<string, string> = {
  primary: 'Node 01 · Primaries',
  secondary: 'Node 02 · Qualifier',
};

/* ---------- the frozen lane strip ---------- */

function LaneStrip() {
  const scene = useActiveScene();
  const pps = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  const setSelection = useUi((s) => s.setSelection);
  const setColorGradeTarget = useUi((s) => s.setColorGradeTarget);
  const targetId = useUi((s) => resolveGradeTargetId(s));

  const duration = Math.max(1, ...scene.tracks.flatMap((t) => t.elements.map((e) => e.startTime + e.duration)), 1);
  const contentW = Math.max(320, Math.ceil(duration * pps) + 32);
  const { labelInterval, tickInterval } = getRulerConfig(pps);
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) ticks.push(Math.round(t * 1000) / 1000);

  const clickClip = (id: string) => {
    setSelection([id]);
    setColorGradeTarget('clip'); // lane clicks re-target the clip mode
  };

  return (
    <div data-testid="shell-color-console-lanes" className="shrink-0 border-b border-hairline bg-panel" style={{ background: '#191a1d' }}>
      <div className="scroll-x flex min-h-0 flex-col overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ width: contentW }}>
          {/* 22px ruler (read-only — scrubbing stays in the viewer transport;
              the playhead marker shows the current position) */}
          <div data-testid="shell-color-console-ruler" className="sticky left-0 flex" style={{ height: RULER_H }}>
            <div aria-hidden className="sticky left-0 z-[2] shrink-0 border-r border-hairline bg-panel" style={{ width: BADGE_W, height: RULER_H }} />
            <div className="relative flex-1" style={{ height: RULER_H, background: 'var(--bg-shell)' }}>
              {ticks.map((t) => {
                const show = shouldShowLabel(t, labelInterval);
                return (
                  <div key={t} className="absolute bottom-0 top-0" style={{ left: t * pps }}>
                    <span aria-hidden className="absolute bottom-[1px] block h-[4px] w-px" style={{ background: '#555' }} />
                    {show && (
                      <span className="mono absolute left-[4px] top-[1px] whitespace-nowrap text-[9px] leading-[9px] text-tmuted">
                        {formatRulerLabel(t)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* mini lanes: video 24px, audio 16px dimmed (C51) */}
          {scene.tracks.map((track) => {
            const h = laneH(track.kind);
            const dim = track.kind === 'audio';
            return (
              <div key={track.id} data-testid={`shell-color-console-lane-${track.id}`} className={`flex ${dim ? 'opacity-45' : ''}`} style={{ height: h }}>
                <div aria-hidden className="sticky left-0 z-[2] flex shrink-0 items-center justify-center border-r border-hairline bg-panel" style={{ width: BADGE_W }}>
                  <span className="mono text-[9px] leading-none text-tmuted">{track.badge}</span>
                </div>
                <div className="relative flex-1 border-b border-[#222]" style={{ background: dim ? '#15161a' : '#1d1e22' }}>
                  {track.elements.map((el) => {
                    const isTarget = targetId === el.id;
                    return (
                      <button
                        key={el.id}
                        type="button"
                        data-testid={`shell-color-console-clip-${el.id}`}
                        aria-label={`${el.name} — set grade target`}
                        aria-pressed={isTarget}
                        title={`${el.name} — click to target`}
                        className={`absolute top-[1px] overflow-hidden rounded-[2px] text-left text-[9px] leading-none ${isTarget ? 'z-[1] border border-accent' : 'border border-[#3a3a42]'}`}
                        style={{
                          left: el.startTime * pps,
                          width: Math.max(14, el.duration * pps - 1),
                          height: h - 3,
                          background: isTarget ? 'color-mix(in srgb, var(--accent-selection) 28%, #2a2b31)' : '#2a2b31',
                          color: 'var(--text-primary)',
                          padding: '2px 3px',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                        onClick={() => clickClip(el.id)}
                      >
                        {el.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* playhead marker across the strip (read-only indicator) */}
          <div aria-hidden className="pointer-events-none absolute bottom-0 top-0 z-[3] w-px" style={{ left: BADGE_W + playhead * pps, background: 'var(--accent-selection)' }}>
            <div className="absolute -left-[3px] top-0 h-[6px] w-[7px]" style={{ background: 'var(--accent-selection)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- the console ---------- */

export function ColorConsole() {
  const tab = useUi((s) => s.colorConsoleTab);
  const setTab = useUi((s) => s.setColorConsoleTab);
  const target = useUi((s) => s.colorGradeTarget);
  const setTarget = useUi((s) => s.setColorGradeTarget);
  const scenes = useUi((s) => s.scenes);
  const targetId = useUi((s) => resolveGradeTargetId(s));
  const selectedNode = useUi((s) => s.selectedColorNodeId);

  const label = gradeTargetLabel(scenes, targetId);
  const nodeChip = selectedNode ? NODE_CHIP[selectedNode] : null;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, current: ConsoleTab) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === current);
    const next = TABS[(idx + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`shell-color-console-tab-${next}`)?.focus());
  };

  return (
    <div data-testid="shell-color-console" className="flex h-full min-h-0 w-full flex-col bg-panel">
      <LaneStrip />

      {/* tab bar + node chip + Clip ⇄ Timeline target toggle */}
      <div className="flex h-[28px] shrink-0 items-stretch border-b border-hairline bg-shell">
        <div role="tablist" aria-label="Color console tools" className="flex items-stretch">
          {TABS.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`shell-color-console-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="shell-color-console-panel"
                tabIndex={selected ? 0 : -1}
                data-testid={`shell-color-console-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, t.id)}
                className={`border-b-2 px-3 text-[12px] transition-colors ${
                  selected ? 'border-accent text-tprimary' : 'border-transparent text-tmuted hover:text-tprimary'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* C56 node chip — which surface the console edits (node selection
            routes this tab; see ColorNodeGraph) */}
        {nodeChip && (
          <span data-testid="shell-color-console-node" className="ml-2 self-center rounded-[2px] border border-strong px-[6px] py-[1px] text-[10px] text-tmuted">
            {nodeChip}
          </span>
        )}

        <div className="grow" />

        {/* Clip ⇄ Timeline grade-target toggle — the timeline grade's ONLY
            editor is this console (single-owner law, D3) */}
        <div role="group" aria-label="Grade target" className="flex items-center gap-1.5 pr-2">
          <button
            type="button"
            aria-pressed={target === 'clip'}
            data-testid="shell-color-console-target-clip"
            aria-label="Grade target: selected clip"
            onClick={() => setTarget('clip')}
            className={`rounded-[2px] border px-[6px] py-[1px] text-[10px] font-semibold transition-colors ${
              target === 'clip' ? 'border-accent text-tprimary' : 'border-strong text-tmuted hover:text-tprimary'
            }`}
          >
            Clip
          </button>
          <button
            type="button"
            aria-pressed={target === 'timeline'}
            data-testid="shell-color-console-target-timeline"
            aria-label="Grade target: timeline"
            onClick={() => setTarget('timeline')}
            className={`rounded-[2px] border px-[6px] py-[1px] text-[10px] font-semibold transition-colors ${
              target === 'timeline' ? 'border-accent text-tprimary' : 'border-strong text-tmuted hover:text-tprimary'
            }`}
          >
            Timeline
          </button>
          <span
            data-testid="shell-color-console-target"
            className="mono max-w-[180px] truncate text-[10px] text-tmuted"
            title={targetId === TIMELINE_GRADE_KEY ? 'Timeline grade' : targetId ?? 'No clip selected'}
          >
            {targetId === TIMELINE_GRADE_KEY ? 'Timeline grade' : targetId ? label : 'no clip selected'}
          </span>
        </div>
      </div>

      {/* the console body — internal scroll (registered: curves tab at the
          1280×800 floor) */}
      <div
        role="tabpanel"
        id="shell-color-console-panel"
        aria-labelledby={`shell-color-console-tab-${tab}`}
        className="scroll-y min-h-0 flex-1 overflow-y-auto"
      >
        {tab === 'primaries' ? <WheelsPanel /> : tab === 'curves' ? <CurvesPanel /> : <QualifierPanel />}
      </div>
    </div>
  );
}

/* TimelineCompact — R22 (DESIGN-R22 D6, issue #75). The generalized frozen
   compact timeline strip, extracted from the scrapped ColorConsole's
   LaneStrip. The reviewer: "this as the most compact view for timeline is
   actually quite nice ... overall this is a timeline style that can be
   generalized" — so it is a FIRST-CLASS reusable component now:
     - R23-WB (DESIGN-R23 D-B3, issue #94): the AppShell mounts it on ANY
       page while the density resolves compact (auto = color + deliver;
       the TimelineToolbar's toggle overrides per session — "this super
       compact mode we should allow to be used everywhere").
   R23-WA (DESIGN-R23 Part IX ruling 8): the seamMode stub + prop RETIRE —
     the FX timeline is the FULL Timeline in fxMode (seam zones need real
     lane pixel geometry), never the compact strip. The stub's "reserved
     surface" contract is dead; no consumer remains.

   Anatomy (the C51 compact set, kept): 22px ruler (read-only + playhead
   marker — scrubbing stays in the viewer transport) · per-kind lanes (video
   24 / audio 16 / caption 20, audio dimmed) · 30px badge column ·
   click-to-target clips (NO trim/drag/resize handles ever — the surface is
   frozen by law).

   R23-WB (DESIGN-R23 D-B3, issue #96 — ruling 19): the badge cell is a REAL
   button now — click = select the track (the selectedTrackId domain, the
   same write TrackHeader performs); title carries the track name ("trackhead
   not working … ideally it can still move" read as selection + name). The
   honest 24px scope: selection + name ONLY — no mute/solo stack fits a 16–24px
   lane (registered in the README deviation ledger).

   R22-D6 V/A/T color coding (issue #75 "we need some meaningful color coding
   still even for V vs. A vs. T etc. track type difference"): the clips paint
   with the reference-derived tokens (--clip-video / --clip-audio-a /
   --clip-text — the davinci mock's own clip colors, theme-variant-aware) on
   the border + tint + badge so the strip reads at 24px lane height. The
   previous all-grey #2a2b31 is dead. */

import { useUi, useActiveScene } from '../../state/useUiStore';
import { getRulerConfig, formatRulerLabel, shouldShowLabel } from '../../lib/rulerTiers';

/* ---------- geometry (C51 compact set, unchanged) ---------- */

const RULER_H = 22;
const VIDEO_H = 24;
const AUDIO_H = 16;
const CAPTION_H = 20;
const BADGE_W = 30;

const laneH = (kind: 'overlay' | 'main' | 'audio' | 'caption') =>
  kind === 'audio' ? AUDIO_H : kind === 'caption' ? CAPTION_H : VIDEO_H;

/* ---------- V/A/T color tokens (D6) ---------- */

type TrackKind = 'overlay' | 'main' | 'audio' | 'caption';

const clipTint: Record<TrackKind, { border: string; tint: string; badge: string }> = {
  main: { border: 'var(--clip-video)', tint: 'color-mix(in srgb, var(--clip-video) 30%, #23242a)', badge: 'var(--clip-video)' },
  overlay: { border: 'var(--clip-video)', tint: 'color-mix(in srgb, var(--clip-video) 22%, #23242a)', badge: 'var(--clip-video)' },
  audio: { border: 'var(--clip-audio-a)', tint: 'color-mix(in srgb, var(--clip-audio-a) 30%, #23242a)', badge: 'var(--clip-audio-a)' },
  caption: { border: 'var(--clip-text)', tint: 'color-mix(in srgb, var(--clip-text) 35%, #23242a)', badge: 'var(--clip-text)' },
};

export interface TimelineCompactProps {
  /** Which grade target a clip click selects. 'grade' (the color page law:
   *  setSelection + re-target clip mode). */
  clipClick?: 'grade';
}

export function TimelineCompact({ clipClick = 'grade' }: TimelineCompactProps) {
  const scene = useActiveScene();
  const pps = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  const setSelection = useUi((s) => s.setSelection);
  const setColorGradeTarget = useUi((s) => s.setColorGradeTarget);
  /* R23-WB (D-B3/#96): the trackhead selection domain — the badge cell
     writes selectedTrackId (the TrackHeader seam; on color the rail stays
     the grade surface — the honest registered limit). */
  const selectedTrackId = useUi((s) => s.selectedTrackId);
  const selectTrack = useUi((s) => s.selectTrack);
  /* reactive target: the selection's first element is the highlighted clip
     (the grade target resolves via the store's resolver elsewhere; the strip
     subscribes to the selection so a re-target repaints immediately). */
  const targetId = useUi((s) => s.selection[0] ?? null);

  const duration = Math.max(1, ...scene.tracks.flatMap((t) => t.elements.map((e) => e.startTime + e.duration)), 1);
  const contentW = Math.max(320, Math.ceil(duration * pps) + 32);
  const { labelInterval, tickInterval } = getRulerConfig(pps);
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) ticks.push(Math.round(t * 1000) / 1000);

  const clickClip = (id: string) => {
    setSelection([id]);
    if (clipClick === 'grade') setColorGradeTarget('clip'); // lane clicks re-target the clip mode
  };

  return (
    <div
      data-testid="shell-timeline-compact"
      className="flex h-full min-h-0 w-full flex-col bg-panel"
      aria-label="Compact timeline (frozen — click a clip to target it)"
    >
      <div className="scroll-x flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden" style={{ background: '#191a1d' }}>
        <div className="relative" style={{ width: contentW }}>
          {/* 22px ruler (read-only — scrubbing stays in the viewer transport;
              the playhead marker shows the current position) */}
          <div data-testid="shell-timeline-compact-ruler" className="sticky left-0 flex" style={{ height: RULER_H }}>
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

          {/* mini lanes: video 24 / caption 20 / audio 16 dimmed (C51) — each
              kind now carries its V/A/T color coding (D6, #75) */}
          {scene.tracks.map((track) => {
            const h = laneH(track.kind);
            const dim = track.kind === 'audio';
            const tone = clipTint[track.kind];
            return (
              <div key={track.id} data-testid={`shell-timeline-compact-lane-${track.id}`} className={`flex ${dim ? 'opacity-55' : ''}`} style={{ height: h }}>
                {/* #96 (ruling 19): the badge cell is a REAL trackhead button —
                    click = selectTrack + title = the track name; the honest
                    24px scope carries selection + name ONLY (no mute/solo
                    stack at this lane height — registered) */}
                <div className="sticky left-0 z-[2] flex shrink-0 border-r border-hairline bg-panel" style={{ width: BADGE_W, height: h }}>
                  <button
                    type="button"
                    data-testid={`shell-timeline-compact-track-${track.id}`}
                    className="flex h-full w-full items-center justify-center hover:bg-[var(--hover-overlay)]"
                    style={{ ...(selectedTrackId === track.id ? { background: 'var(--hover-overlay)' } : {}) }}
                    title={track.name}
                    aria-label={`Select track ${track.name}`}
                    aria-pressed={selectedTrackId === track.id}
                    onClick={() => selectTrack(track.id)}
                  >
                    <span className="mono text-[9px] font-semibold leading-none" style={{ color: tone.badge }}>{track.badge}</span>
                  </button>
                </div>
                <div className="relative flex-1 border-b border-[#222]" style={{ background: dim ? '#15161a' : '#1d1e22' }}>
                  {track.elements.map((el) => {
                    const isTarget = targetId === el.id;
                    return (
                      <button
                        key={el.id}
                        type="button"
                        data-testid={`shell-timeline-compact-clip-${el.id}`}
                        aria-label={`${el.name} — set grade target`}
                        aria-pressed={isTarget}
                        title={`${el.name} — click to target`}
                        className={`absolute top-[1px] overflow-hidden rounded-[2px] border text-left text-[9px] leading-none ${isTarget ? 'z-[1] border-[var(--accent-selection)]' : ''}`}
                        style={{
                          left: el.startTime * pps,
                          width: Math.max(14, el.duration * pps - 1),
                          height: h - 3,
                          borderColor: isTarget ? 'var(--accent-selection)' : tone.border,
                          background: isTarget
                            ? 'color-mix(in srgb, var(--accent-selection) 28%, ' + tone.tint + ')'
                            : tone.tint,
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

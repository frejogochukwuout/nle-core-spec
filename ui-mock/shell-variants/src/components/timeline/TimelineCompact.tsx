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
   previous all-grey #2a2b31 is dead.

   R23-WF (DESIGN-R23 D-F1, issue #107): the 32px interactive in/out RANGE
   BAND (RangeBand.tsx) — the export range = the loop seam; the drag
   grammar cloned from the Ruler brackets per ruling 21.

   R24-W4 (DESIGN-R24 A3-R7, issue #71 — the COEXISTENCE law, superseding
   R23-WF's head-row swap): the 22px read-only ruler is UNCONDITIONAL on
   EVERY page (rulerTiers ticks + TC labels, the full Ruler's grammar at
   compact scale), and the 32px RangeBand mounts BELOW it on the DELIVER
   branch only — a 54px head stack ("under export view timeline is
   compacted but there's no ruler and no range clamp which is like the
   BIGGEST if not the only thing we need here": the ruler answers the
   no-ruler half on every page, the band the no-clamp half on deliver).
   The ruler gains READ-ONLY in/out bracket FLAGS at the loop edges —
   pointer-events-none thin glyphs (the loop seam's brackets in miniature;
   the band below is the interactive writer). The LANES stay frozen on
   every page — the band is the strip's one interactive head surface,
   asked for only by the deliver mount (AppShell passes rangeBand on the
   deliver branch); every other page keeps the ruler alone. */

import { useUi, useActiveScene } from '../../state/useUiStore';
import { getRulerConfig, formatRulerLabel, shouldShowLabel } from '../../lib/rulerTiers';
import { snapPxToDeviceGrid } from '../../lib/pixel';
import { RangeBand } from './RangeBand';

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
  /** What a clip click does. 'grade' (the COLOR page law: setSelection +
   *  re-target clip mode); 'select' (every other page: plain selection —
   *  R23-FIX R3-P3#8, the honest per-page label: a "set grade target"
   *  label on pages with no grade surface was a lying affordance). */
  clipClick?: 'grade' | 'select';
  /** R24-W4 (A3-R7, #71): mount the 32px interactive in/out RANGE BAND
   *  BELOW the (now unconditional) 22px read-only ruler — a 54px head
   *  stack on the deliver composition only. The lanes stay frozen either
   *  way — the band is the strip's one interactive head surface, and only
   *  the deliver mount asks for it. */
  rangeBand?: boolean;
}

export function TimelineCompact({ clipClick = 'grade', rangeBand = false }: TimelineCompactProps) {
  const scene = useActiveScene();
  const pps = useUi((s) => s.pxPerSec);
  const playhead = useUi((s) => s.playhead);
  /* A3-R7: the read-only in/out FLAGS ride the (unconditional) ruler — the
     loop seam's edges marked at the ruler's own scale (the interactive
     writers are the band below on deliver, the Ruler brackets / I-O keys
     elsewhere; these glyphs never take a pointer). */
  const loop = useUi((s) => s.loop);
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
    /* R23-FIX (R3-P3#8): the grade RE-TARGET write rides only the color
       mount — on other pages the strip is a selector (the AppShell passes
       'select'; nothing else writes colorGradeTarget from here). */
    if (clipClick === 'grade') setColorGradeTarget('clip');
  };

  return (
    <div
      /* R23-FIX (R3-P3#7): the same id the full Timeline carries — the two
         surfaces never coexist, so SceneTabs' aria-controls="shell-timeline"
         always resolves (see Timeline.tsx). */
      id="shell-timeline"
      data-testid="shell-timeline-compact"
      className="flex h-full min-h-0 w-full flex-col bg-panel"
      aria-label={rangeBand
        ? 'Compact timeline (lanes frozen — the export range band above is interactive)'
        : clipClick === 'grade'
          ? 'Compact timeline (frozen — click a clip to target it)'
          : 'Compact timeline (frozen — click a clip to select it)'}
    >
      <div className="scroll-x flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden" style={{ background: '#191a1d' }}>
        <div className="relative" style={{ width: contentW }}>
          {/* head stack — A3-R7 (#71) COEXISTENCE: the 22px READ-ONLY ruler
              is UNCONDITIONAL on every page (rulerTiers ticks + TC labels —
              the full Timeline's Ruler grammar at compact scale; this block
              IS the strip's ruler, read against the full Ruler's law),
              carrying the read-only in/out bracket FLAGS at the loop edges.
              On the DELIVER branch only, the 32px interactive RANGE BAND
              mounts BELOW it (54px total head stack; the R23-WF
              ruler-replacement is dead). */}
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
              {/* the read-only in/out bracket FLAGS (A3-R7): thin 1px glyphs
                  at the loop edges — the loop seam's brackets in miniature,
                  pointer-events-none by law (the band below / the Ruler
                  brackets elsewhere are the interactive writers). Anchored
                  INSIDE the loop span like the Ruler's own bracket glyphs. */}
              {(['in', 'out'] as const).map((side) => {
                const x = side === 'in'
                  ? snapPxToDeviceGrid(loop.start * pps)
                  : Math.max(0, snapPxToDeviceGrid(loop.end * pps) - 8);
                return (
                  <svg
                    key={side}
                    data-testid={`shell-timeline-compact-flag-${side}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0"
                    width="8"
                    height={RULER_H - 2}
                    style={{ left: x }}
                  >
                    <path
                      d={side === 'in'
                        ? `M7 1 L2 1 L2 ${RULER_H - 3} L7 ${RULER_H - 3}`
                        : `M1 1 L6 1 L6 ${RULER_H - 3} L1 ${RULER_H - 3}`}
                      stroke="color-mix(in srgb, var(--accent-selection) 60%, transparent)"
                      strokeWidth="1"
                      fill="none"
                    />
                  </svg>
                );
              })}
            </div>
          </div>
          {rangeBand && <RangeBand duration={duration} pps={pps} />}

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
                        aria-label={`${el.name} — ${clipClick === 'grade' ? 'set grade target' : 'select clip'}`}
                        aria-pressed={isTarget}
                        title={`${el.name} — click to ${clipClick === 'grade' ? 'target' : 'select'}`}
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

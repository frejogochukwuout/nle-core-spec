/* Ruler — spec 05 §7/§14.3: DOM ticks + labels, click-to-seek, in/out +
   loop shading with BRACKETS (band stays visible when loop is off — dimmed,
   never erased), markers (spec 16 §3.7 palette), frame ticks at high zoom.
   44px zone in readout mode (labels + 22px tick strip), 22px slim. */

import { useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { useHeaderStyle } from '../../state/variantHooks';
import { tc, tcRuler } from '../../lib/timecode';
import type { Marker, SceneJSON } from '../../lib/mockData';

const MARKER_COLORS: Record<Marker['color'], string> = {
  red: 'var(--mk-red)', orange: 'var(--mk-orange)', yellow: 'var(--mk-yellow)', green: 'var(--mk-green)',
  blue: 'var(--mk-blue)', purple: 'var(--mk-purple)', pink: 'var(--mk-pink)', gray: 'var(--mk-gray)',
};

export function Ruler({ scene, duration, pxPerSec, playhead }: { scene: SceneJSON; duration: number; pxPerSec: number; playhead: number }) {
  const headerStyle = useHeaderStyle();
  const zoneH = headerStyle === 'readout' ? 44 : 22;
  const setPlayhead = useUi((s) => s.setPlayhead);
  const loop = useUi((s) => s.loop);
  const loopEnabled = useUi((s) => s.loopEnabled);
  const ref = useRef<HTMLDivElement>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);

  const contentW = (duration + 4) * pxPerSec;

  // adaptive density (spec 05 tick/label spacing rules, simplified)
  const labelEvery = pxPerSec >= 120 ? 2 : pxPerSec >= 20 ? 5 : 15;
  const minorEvery = pxPerSec >= 20 ? 1 : 5;
  const frameTicks = pxPerSec >= 110; // sub-second reference for trim/blade work

  const seek = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setPlayhead(Math.max(0, (clientX - box.left) / pxPerSec));
  };

  const ticks: number[] = [];
  for (let t = 0; t <= duration + 2; t += minorEvery) ticks.push(t);
  const frameTickList: number[] = [];
  if (frameTicks) {
    const step = pxPerSec >= 200 ? 1 / 24 : 2 / 24; // every 1-2 frames
    for (let t = 0; t <= duration + 2; t += step) frameTickList.push(t);
  }
  const labels: number[] = [];
  for (let t = 0; t <= duration + 2; t += labelEvery) labels.push(t);

  const tickH = headerStyle === 'readout' ? 12 : 7;
  const isMajor = (t: number) => Math.abs(t % labelEvery) < 1e-6;

  const bandLeft = loop.start * pxPerSec;
  const bandW = Math.max(2, (loop.end - loop.start) * pxPerSec);

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Timeline ruler"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration * 24)}
      aria-valuenow={Math.round(playhead * 24)}
      aria-valuetext={tc(playhead)}
      className="relative shrink-0 cursor-pointer border-b border-hairline bg-shell"
      style={{ height: zoneH, width: contentW }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        seek(e.clientX);
      }}
      onPointerMove={(e) => {
        const box = ref.current?.getBoundingClientRect();
        if (box) setHoverT(Math.max(0, (e.clientX - box.left) / pxPerSec));
        if (e.buttons === 1) seek(e.clientX);
      }}
      onPointerLeave={() => setHoverT(null)}
    >
      {/* frame ticks (sub-second reference) */}
      {frameTickList.map((t, i) => (
        <div key={`f${i}`} className="absolute bottom-0 w-px" style={{ left: t * pxPerSec, height: 4, background: 'var(--text-faint)', opacity: 0.35 }} />
      ))}

      {/* minor + major ticks */}
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute bottom-0 w-px"
          style={{ left: t * pxPerSec, height: isMajor(t) ? tickH : tickH * 0.55, background: 'var(--text-faint)', opacity: isMajor(t) ? 0.9 : 0.45 }}
        />
      ))}

      {/* labels */}
      {labels.map((t) => (
        <span
          key={t}
          className="mono absolute select-none text-[11px] text-tmuted"
          style={{ left: t * pxPerSec + 4, top: headerStyle === 'readout' ? 5 : 1 }}
        >
          {tcRuler(t, frameTicks)}
        </span>
      ))}

      {/* in/out + loop range — bracketed band, dimmed (not erased) when loop is off */}
      <div
        className="absolute bottom-0 top-0"
        style={{ left: bandLeft, width: bandW, background: 'var(--accent-selection)', opacity: loopEnabled ? 0.24 : 0.13 }}
      />
      {/* in bracket */}
      <svg className="pointer-events-none absolute" style={{ left: bandLeft - 2, top: headerStyle === 'readout' ? 16 : 3 }} width="9" height={zoneH - (headerStyle === 'readout' ? 18 : 5)} aria-hidden="true">
        <path d={`M7 0 L1 ${zoneH / 4} M7 0 L1 0 M7 0 L1 ${zoneH / 2.6}`} stroke="var(--accent-selection)" strokeWidth="1.6" fill="none" />
      </svg>
      {/* out bracket */}
      <svg className="pointer-events-none absolute" style={{ left: bandLeft + bandW - 7, top: headerStyle === 'readout' ? 16 : 3 }} width="9" height={zoneH - (headerStyle === 'readout' ? 18 : 5)} aria-hidden="true">
        <path d={`M2 0 L8 ${zoneH / 4} M2 0 L8 0 M2 0 L8 ${zoneH / 2.6}`} stroke="var(--accent-selection)" strokeWidth="1.6" fill="none" />
      </svg>

      {/* markers — larger pins, always-visible labels at readout zoom */}
      {scene.markers.map((m) => (
        <div
          key={m.id}
          data-tip={`${m.label} · ${tc(m.time)}`}
          data-tip-top
          className="absolute z-[6]"
          style={{ left: m.time * pxPerSec - 5, top: headerStyle === 'readout' ? 22 : 5 }}
          aria-label={`Marker ${m.label}`}
        >
          <svg width="10" height="13" viewBox="0 0 10 13" aria-hidden="true">
            <path d="M0 0h10v7.2L5 12.2 0 7.2V0z" fill={MARKER_COLORS[m.color]} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        </div>
      ))}

      {/* hover TC readout */}
      {hoverT !== null && (
        <span
          className="mono pointer-events-none absolute rounded-sm border border-strong bg-inset px-1 text-[11px] text-tmuted"
          style={{ left: Math.min(hoverT * pxPerSec + 8, contentW - 76), top: headerStyle === 'readout' ? 24 : 4 }}
        >
          {tc(hoverT)}
        </span>
      )}
    </div>
  );
}

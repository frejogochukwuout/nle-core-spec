/* Ruler — spec 05 §7/§14.3: DOM ticks + labels, click-to-seek, in/out +
   loop shading, markers (spec 16 §3.7 palette), playhead head grab zone.
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

export function Ruler({ scene, duration, pxPerSec }: { scene: SceneJSON; duration: number; pxPerSec: number }) {
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

  const seek = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setPlayhead(Math.max(0, (clientX - box.left) / pxPerSec));
  };

  const ticks: number[] = [];
  for (let t = 0; t <= duration + 2; t += minorEvery) ticks.push(t);
  const labels: number[] = [];
  for (let t = 0; t <= duration + 2; t += labelEvery) labels.push(t);

  const tickH = headerStyle === 'readout' ? 12 : 7;
  const isMajor = (t: number) => Math.abs(t % labelEvery) < 1e-6;

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Timeline ruler"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration * 24)}
      aria-valuenow={0}
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
          className="mono absolute select-none text-[10.5px] text-tmuted"
          style={{ left: t * pxPerSec + 4, top: headerStyle === 'readout' ? 6 : 2 }}
        >
          {tcRuler(t)}
        </span>
      ))}

      {/* in/out + loop range shading (adopted gap-fill G12) */}
      <div
        className="absolute bottom-0 top-0"
        style={{
          left: loop.start * pxPerSec,
          width: Math.max(2, (loop.end - loop.start) * pxPerSec),
          background: 'var(--accent-selection)',
          opacity: loopEnabled ? 0.16 : 0.07,
        }}
      />
      <div className="absolute bottom-0 top-0 w-px" style={{ left: loop.start * pxPerSec, background: 'var(--accent-selection)', opacity: 0.8 }} />
      <div className="absolute bottom-0 top-0 w-px" style={{ left: loop.end * pxPerSec, background: 'var(--accent-selection)', opacity: 0.8 }} />

      {/* markers */}
      {scene.markers.map((m) => (
        <div
          key={m.id}
          data-tip={`${m.label} · ${tc(m.time)}`}
          data-tip-top
          className="absolute"
          style={{ left: m.time * pxPerSec - 4, top: headerStyle === 'readout' ? 20 : 4 }}
          aria-label={`Marker ${m.label}`}
        >
          <svg width="9" height="12" viewBox="0 0 9 12" aria-hidden="true">
            <path d="M0 0h9v6.8L4.5 11 0 6.8V0z" fill={MARKER_COLORS[m.color]} />
          </svg>
        </div>
      ))}

      {/* hover TC readout */}
      {hoverT !== null && (
        <span
          className="mono pointer-events-none absolute rounded-sm border border-strong bg-inset px-1 text-[9.5px] text-tmuted"
          style={{ left: Math.min(hoverT * pxPerSec + 8, contentW - 70), top: headerStyle === 'readout' ? 24 : 3 }}
        >
          {tc(hoverT)}
        </span>
      )}
    </div>
  );
}

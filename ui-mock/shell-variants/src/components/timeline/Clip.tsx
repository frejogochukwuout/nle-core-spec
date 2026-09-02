/* Clip — spec 05 §7.3 anatomy: position:absolute, timeToPx geometry,
   filmstrip / waveform / label children, trim handles (12px hit), transition
   indicator, fade triangles, linked badge. Two render modes:
   filmstrip (spec 05 canonical) | blocks (davinci mock compact). */

import { useRef, useState } from 'react';
import { Link2, Scissors } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { useVariantClipStyle } from '../../state/variantHooks';
import { mediaById, type ElementJSON, type TrackJSON } from '../../lib/mockData';
import { snapToFrame, tc } from '../../lib/timecode';
import { getWaveform } from '../../lib/waveform';

interface ClipProps {
  el: ElementJSON;
  track: TrackJSON;
  pxPerSec: number;
  laneHeight: number;
  snapTargets: number[];
}

type DragState = { mode: 'move' | 'l' | 'r'; startX: number; origStart: number; origDur: number; cur: number } | null;

export function Clip({ el, track, pxPerSec, laneHeight, snapTargets }: ClipProps) {
  const clipStyle = useVariantClipStyle();
  const tool = useUi((s) => s.tool);
  const selection = useUi((s) => s.selection);
  const selectElement = useUi((s) => s.selectElement);
  const splitElement = useUi((s) => s.splitElement);
  const moveElement = useUi((s) => s.moveElement);
  const trimElement = useUi((s) => s.trimElement);
  const snap = useUi((s) => s.snap);

  const [drag, setDrag] = useState<DragState>(null);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = selection.includes(el.id);
  const locked = track.locked;
  const media = mediaById(el.mediaId);
  const isAudio = el.type === 'audio';
  const isText = el.type === 'text';

  // live geometry (drag preview = optimistic DOM state, spec 18 §5)
  const geo = drag
    ? drag.mode === 'move'
      ? { left: drag.cur, width: el.duration * pxPerSec }
      : drag.mode === 'l'
        ? { left: drag.cur, width: (drag.origStart + drag.origDur - drag.cur) * pxPerSec }
        : { left: el.startTime * pxPerSec, width: (drag.cur - el.startTime) * pxPerSec }
    : { left: el.startTime * pxPerSec, width: el.duration * pxPerSec };

  const applySnap = (t: number, ignoreSelf: boolean): { t: number; snapped: boolean } => {
    const frameSnapped = snapToFrame(t);
    if (!snap) return { t: frameSnapped, snapped: false };
    const tolPx = 10 / pxPerSec; // 10px screen-space (spec 05 §9)
    let best = frameSnapped, bestD = tolPx, snapped = false;
    for (const target of snapTargets) {
      if (ignoreSelf && Math.abs(target - el.startTime) < 1e-6) continue;
      const d = Math.abs(target - t);
      if (d < bestD) { best = target; bestD = d; snapped = true; }
    }
    return { t: Math.max(0, best), snapped };
  };

  const onPointerDownBody = (e: React.PointerEvent) => {
    if (locked) return;
    if (tool === 'blade') return; // handled by click
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ mode: 'move', startX: e.clientX, origStart: el.startTime, origDur: el.duration, cur: el.startTime });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dt = (e.clientX - drag.startX) / pxPerSec;
    if (drag.mode === 'move') {
      const { t } = applySnap(drag.origStart + dt, false);
      setDrag({ ...drag, cur: t });
    } else if (drag.mode === 'l') {
      const { t } = applySnap(drag.origStart + dt, false);
      const maxStart = drag.origStart + drag.origDur - 0.25;
      setDrag({ ...drag, cur: Math.min(t, maxStart) });
    } else {
      const { t } = applySnap(drag.origStart + drag.origDur + dt, true);
      setDrag({ ...drag, cur: Math.max(drag.origStart + 0.25, t) });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.mode === 'move' && Math.abs(drag.cur - drag.origStart) > 1e-6) moveElement(el.id, drag.cur);
    if (drag.mode === 'l') trimElement(el.id, 'l', drag.cur, drag.origStart + drag.origDur - drag.cur);
    if (drag.mode === 'r') trimElement(el.id, 'r', el.startTime, drag.cur - el.startTime);
    setDrag(null);
  };

  const onClick = (e: React.MouseEvent) => {
    if (locked) return;
    if (tool === 'blade') {
      // split at click position (spec 06 §5.1)
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const local = e.clientX - rect.left;
      const cutTime = el.startTime + local / pxPerSec;
      splitElement(el.id, cutTime);
      return;
    }
    selectElement(el.id, e.shiftKey || e.metaKey);
  };

  const cursor = locked ? 'not-allowed' : tool === 'blade' ? 'crosshair' : drag?.mode === 'move' ? 'grabbing' : 'move';

  const fadeLeftW = (el.audioFadeIn ?? 0) * pxPerSec;
  const fadeRightW = (el.audioFadeOut ?? 0) * pxPerSec;
  const transW = el.transitionOut ? el.transitionOut.duration * pxPerSec : 0;

  /* ---------- clip body by mode/type ---------- */
  let body: React.ReactNode;
  if (clipStyle === 'blocks') {
    body = (
      <div className="flex h-full items-center overflow-hidden px-1.5" style={{ background: isAudio ? 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))' : isText ? 'var(--clip-text)' : 'var(--clip-video)' }}>
        {clipLabel(10, '#fff')}
      </div>
    );
  } else if (isAudio) {
    const bars = getWaveform(el.id, Math.max(8, Math.floor(geo.width / 4)), { amplitude: 1 });
    const h = laneHeight - 10;
    body = (
      <div className="relative h-full w-full" style={{ background: 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))' }}>
        <svg className="absolute inset-0" width="100%" height={h + 4} preserveAspectRatio="none" aria-hidden="true">
          {bars.map((b, i) => (
            <rect key={i} x={`${i * (100 / bars.length)}%`} y={(h + 4) / 2 - b.max * (h / 2)} width={`${100 / bars.length - 0.4}%`} height={Math.max(1, (b.max + b.min) * (h / 2) * 0.5)} fill="var(--waveform)" opacity={0.75} />
          ))}
        </svg>
        {fadeLeftW > 4 && (
          <div className="absolute inset-y-0 left-0" style={{ width: fadeLeftW, background: 'linear-gradient(to right, rgba(0,0,0,0.55), transparent)' }} />
        )}
        {fadeRightW > 4 && (
          <div className="absolute inset-y-0 right-0" style={{ width: fadeRightW, background: 'linear-gradient(to left, rgba(0,0,0,0.55), transparent)' }} />
        )}
        {clipLabel(9.5, '#eafff0')}
      </div>
    );
  } else if (isText) {
    body = <div className="flex h-full items-center justify-center overflow-hidden" style={{ background: 'var(--clip-text)' }}>{clipLabel(10.5, '#fff', 'center')}</div>;
  } else {
    // filmstrip video clip (spec 05 §7.1: 80px-wide thumbs, 60px strip in 80px lane)
    const stripH = Math.min(60, laneHeight - 18);
    body = (
      <div className="relative h-full w-full" style={{ background: 'var(--clip-video)' }}>
        {media?.thumbnail && (
          <div
            className="w-full"
            style={{
              height: stripH,
              backgroundImage: `url(${media.thumbnail})`,
              backgroundSize: '80px 100%',
              backgroundRepeat: 'repeat-x',
              filter: media.offline ? 'grayscale(1) opacity(0.35)' : 'none',
            }}
          />
        )}
        {clipLabel(9.5, 'var(--clip-label-text)')}
        {media?.offline && (
          <span className="absolute right-1.5 top-1 rounded-sm bg-[var(--danger)]/90 px-1 py-px text-[8.5px] font-bold text-white">OFFLINE</span>
        )}
      </div>
    );
  }

  function clipLabel(fontSize: number, color: string, align: 'left' | 'center' = 'left') {
    return (
      <span
        className="pointer-events-none absolute bottom-0 left-0 right-0 truncate px-1.5 pb-[3px] font-medium"
        style={{ fontSize, color, textAlign: align, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
      >
        {el.name}
        {el.speed && el.speed !== 1 && <span className="mono ml-1 opacity-70">{Math.round(el.speed * 100)}%</span>}
      </span>
    );
  }

  return (
    <div
      ref={ref}
      role="button"
      aria-label={`${el.name}, ${tc(el.startTime)}`}
      data-testid={`clip-${el.id}`}
      className={`absolute top-[2px] bottom-[2px] overflow-hidden rounded-[2px] ${drag ? 'z-10' : ''} ${selected ? 'z-[5]' : ''}`}
      style={{
        left: geo.left,
        width: Math.max(6, geo.width),
        cursor,
        opacity: drag ? 0.75 : locked ? 0.5 : 1,
        pointerEvents: locked ? 'none' : 'auto',
        outline: selected ? '1.5px solid var(--accent-selection)' : hover ? '1px solid var(--border-strong)' : 'none',
        outlineOffset: 0,
        boxShadow: drag ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
      }}
      onPointerDown={onPointerDownBody}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {body}

      {/* trim handles — 12px hit strips, ew-resize (spec 05 §14.2) */}
      {clipStyle === 'filmstrip' && !locked && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-3"
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ mode: 'l', startX: e.clientX, origStart: el.startTime, origDur: el.duration, cur: el.startTime });
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <div
            className="absolute inset-y-0 right-0 w-3"
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ mode: 'r', startX: e.clientX, origStart: el.startTime, origDur: el.duration, cur: el.startTime + el.duration });
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </>
      )}

      {/* transition indicator (crossfade at out-boundary) */}
      {el.transitionOut && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center border-l"
          style={{ width: transW, background: 'linear-gradient(135deg, var(--transition-mark) 0%, rgba(0,0,0,0.25) 100%)', borderColor: 'var(--transition-mark)' }}
          title={`Crossfade · ${el.transitionOut.presentation} · ${el.transitionOut.duration}s`}
        >
          <Scissors size={9} className="opacity-80" aria-hidden="true" />
        </div>
      )}

      {/* linked A/V badge (spec 05 §12.3) */}
      {el.linkedTo && (
        <span className="absolute right-1 top-1 flex items-center rounded-sm bg-black/40 px-1 text-tprimary" title="Linked A/V">
          <Link2 size={9} strokeWidth={2.2} />
        </span>
      )}

      {/* effect badges (F/T/S/♪ — spec 18 §9) */}
      {el.effects?.some((f) => f.enabled) && (
        <span className="mono absolute left-1 top-1 rounded-sm bg-black/50 px-1 text-[8.5px] font-bold text-white">F</span>
      )}
    </div>
  );
}

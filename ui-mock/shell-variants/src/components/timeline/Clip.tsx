/* Clip — spec 05 §7.3 anatomy: position:absolute, timeToPx geometry,
   filmstrip / waveform / label children, trim handles (12px hit), fade
   triangles (§9), linked badge. Two render modes:
   filmstrip (spec 05 canonical) | blocks (davinci mock compact).
   Selected = accent outline + tint; locked = stripes (legible, not faded);
   drag = optimistic preview + live TC bubble; commit on release (18 §5). */

import { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
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

type DragState = { mode: 'move' | 'l' | 'r'; startX: number; origStart: number; origDur: number; cur: number; alt: boolean } | null;

export function Clip({ el, track, pxPerSec, laneHeight, snapTargets }: ClipProps) {
  const clipStyle = useVariantClipStyle();
  const tool = useUi((s) => s.tool);
  const selection = useUi((s) => s.selection);
  const selectElement = useUi((s) => s.selectElement);
  const splitElement = useUi((s) => s.splitElement);
  const moveElement = useUi((s) => s.moveElement);
  const trimElement = useUi((s) => s.trimElement);
  const duplicateElements = useUi((s) => s.duplicateElements);
  const snap = useUi((s) => s.snap);

  const [drag, setDrag] = useState<DragState>(null);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dragCancelled = useRef(false); // Esc during a drag → drop dispatches nothing
  const suppressClick = useRef(false); // swallow the trailing click after a gesture (alt-drop / Esc-cancel)
  const dragOn = drag !== null;

  /* Escape cancels an active drag (preview snaps back, nothing commits).
     Capture-phase + stopPropagation so the shell Esc cascade (tool →
     deselect) doesn't also fire while a gesture is in flight. */
  useEffect(() => {
    if (!dragOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      dragCancelled.current = true;
      suppressClick.current = true; // the trailing click must not select either
      setDrag(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dragOn]);

  const selected = selection.includes(el.id);
  const locked = track.locked;
  const media = mediaById(el.mediaId);
  const isAudio = el.type === 'audio';
  const isText = el.type === 'text';

  // live geometry (drag preview = optimistic DOM state, spec 18 §5)
  const geo = drag
    ? drag.mode === 'move'
      ? { left: drag.cur * pxPerSec, width: el.duration * pxPerSec }
      : drag.mode === 'l'
        ? { left: drag.cur * pxPerSec, width: (drag.origStart + drag.origDur - drag.cur) * pxPerSec }
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
    dragCancelled.current = false;
    suppressClick.current = false; // fresh gesture — clear any stale suppression
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ mode: 'move', startX: e.clientX, origStart: el.startTime, origDur: el.duration, cur: el.startTime, alt: e.altKey });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dt = (e.clientX - drag.startX) / pxPerSec;
    if (drag.mode === 'move') {
      const { t } = applySnap(drag.origStart + dt, false);
      setDrag({ ...drag, cur: t, alt: e.altKey }); // Alt held? = duplicate gesture
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
    if (!drag) {
      dragCancelled.current = false; // stale flag after an Esc-cancelled drag
      return;
    }
    if (dragCancelled.current) {
      // Esc was pressed mid-gesture: restore the element, dispatch nothing
      dragCancelled.current = false;
      setDrag(null);
      return;
    }
    if (drag.mode === 'move') {
      if (drag.alt && Math.abs(drag.cur - drag.origStart) > 1e-6) {
        // Alt+drag = duplicate: spawn a copy at the drop position, original
        // stays put. duplicateElements() selects the new ids, so read the new
        // id straight back from the store, then move it to the drop time. The
        // trailing click is suppressed so the new copy stays selected.
        suppressClick.current = true;
        duplicateElements([el.id]);
        const newId = useUi.getState().selection[0];
        if (newId) moveElement(newId, drag.cur);
      } else if (!drag.alt && Math.abs(drag.cur - drag.origStart) > 1e-6) {
        moveElement(el.id, drag.cur);
      }
    }
    if (drag.mode === 'l') trimElement(el.id, 'l', drag.cur, drag.origStart + drag.origDur - drag.cur);
    if (drag.mode === 'r') trimElement(el.id, 'r', el.startTime, drag.cur - el.startTime);
    setDrag(null);
  };

  const onClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      // gesture just ended (alt-duplicate drop or Esc-cancel) — the synthesized
      // click would otherwise re-select the original and clobber the result
      suppressClick.current = false;
      return;
    }
    if (locked) return;
    if (tool === 'blade') {
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

  const clipLabel = (color: string, align: 'left' | 'center' = 'left') => (
    <span
      className="pointer-events-none absolute bottom-0 left-0 right-0 truncate px-1.5 pb-[3px] font-medium"
      style={{ fontSize: 11, color, textAlign: align, textShadow: '0 1px 2px rgba(0,0,0,0.6)', lineHeight: 1.2 }}
    >
      {el.name}
      {el.speed && el.speed !== 1 && <span className="mono ml-1 opacity-70">{Math.round(el.speed * 100)}%</span>}
    </span>
  );

  /* ---------- clip body by mode/type ---------- */
  let body: React.ReactNode;
  if (clipStyle === 'blocks') {
    body = (
      <div
        className="flex h-full items-center overflow-hidden px-1.5"
        style={{
          background: isAudio ? 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))' : isText ? 'var(--clip-text)' : 'var(--clip-video)',
          borderRight: `1px solid var(--clip-audio-edge)`,
        }}
      >
        {clipLabel(isAudio ? '#eafff0' : 'var(--clip-label-text)')}
      </div>
    );
  } else if (isAudio) {
    const bars = getWaveform(el.id, Math.max(8, Math.floor(geo.width / 4)), { amplitude: 1 });
    const h = laneHeight - 12;
    body = (
      <div className="relative h-full w-full" style={{ background: 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))' }}>
        <svg className="absolute inset-x-0 bottom-[2px]" width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
          {bars.map((b, i) => (
            <rect key={i} x={`${i * (100 / bars.length)}%`} y={h / 2 - b.max * (h / 2)} width={`${100 / bars.length - 0.4}%`} height={Math.max(1, (b.max + b.min) * (h / 2) * 0.5)} fill="var(--waveform)" opacity={0.9} />
          ))}
        </svg>
        {/* fade ramps — white lines + handle dots + soft fill (spec 05 §14.10) */}
        {fadeLeftW > 6 && (
          <svg className="pointer-events-none absolute inset-y-0 left-0" width={fadeLeftW} height="100%" aria-hidden="true">
            <line x1="1" y1="0" x2={fadeLeftW - 1} y2="100%" stroke="var(--fade-line)" strokeWidth="2" />
            <circle cx="3" cy="3" r="2.6" fill="var(--fade-line)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        )}
        {fadeRightW > 6 && (
          <svg className="pointer-events-none absolute inset-y-0 right-0" width={fadeRightW} height="100%" aria-hidden="true">
            <line x1={fadeRightW - 2} y1="0" x2="1" y2="100%" stroke="var(--fade-line)" strokeWidth="2" />
            <circle cx={fadeRightW - 4} cy="3" r="2.6" fill="var(--fade-line)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        )}
        {clipLabel('var(--clip-audio-label)')}
      </div>
    );
  } else if (isText) {
    body = (
      <div
        className="flex h-full items-center justify-center overflow-hidden"
        style={{ background: 'var(--clip-text)', borderRight: '1px solid rgba(0,0,0,0.25)' }}
      >
        {clipLabel('var(--clip-text-label)', 'center')}
      </div>
    );
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
        {clipLabel('var(--clip-label-text)')}
        {media?.offline && (
          <span className="mono absolute right-1.5 top-1 rounded-sm bg-[var(--danger)]/90 px-1 py-px text-[11px] font-bold text-white">OFFLINE</span>
        )}
      </div>
    );
  }

  /* Alt+drag duplicate gesture: faded ghost copy pinned at the ORIGINAL
     position (visual only — the dragged preview is the copy-in-flight; on
     drop the store duplicates and the original never moves). */
  const showGhost = drag !== null && drag.mode === 'move' && drag.alt;
  const ghost = showGhost ? (
    <div
      data-testid={`clip-ghost-${el.id}`}
      aria-hidden="true"
      className="clip-drag-ghost absolute top-[2px] bottom-[2px] rounded-[2px]"
      style={{
        left: drag.origStart * pxPerSec,
        width: Math.max(6, el.duration * pxPerSec),
        background: isAudio
          ? 'linear-gradient(to bottom, var(--clip-audio-a), var(--clip-audio-b))'
          : isText
            ? 'var(--clip-text)'
            : 'var(--clip-video)',
      }}
    >
      {clipLabel(isAudio ? 'var(--clip-audio-label)' : isText ? 'var(--clip-text-label)' : 'var(--clip-label-text)')}
    </div>
  ) : null;

  return (
    <>
      {ghost}
      <div
        ref={ref}
        role="button"
        aria-label={`${el.name}, ${tc(el.startTime)}`}
        data-testid={`clip-${el.id}`}
        className={`clip-box absolute top-[2px] bottom-[2px] ${drag ? 'z-10' : ''} ${selected ? 'z-[5]' : ''}`}
      style={{
        left: geo.left,
        width: Math.max(6, geo.width),
        cursor,
        pointerEvents: locked ? 'none' : 'auto',
        outline: selected ? '1.5px solid var(--accent-selection)' : hover ? '1px solid var(--border-strong)' : 'none',
        outlineOffset: 0,
        boxShadow: selected
          ? 'inset 0 0 0 999px color-mix(in srgb, var(--accent-selection) 12%, transparent)'
          : drag
            ? '0 4px 12px rgba(0,0,0,0.45)'
            : 'none',
      }}
      onPointerDown={onPointerDownBody}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* inner clipping box (label + body clip; badges overflow) */}
      <div className="clip-box absolute inset-0 overflow-hidden">{body}</div>

      {/* locked overlay — stripes ON TOP of the body (legible, R2) */}
      {locked && <div className="locked-stripes pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />}

      {/* live trim/move TC bubble (spec 06 §8 overlay pattern) */}
      {drag && (
        <span
          className="mono pointer-events-none absolute -top-[22px] left-0 whitespace-nowrap rounded-[var(--radius-sm)] border border-strong bg-inset px-1.5 py-px text-[11px] text-tprimary shadow-lg"
          data-testid="clip-drag-tc"
        >
          {tc(drag.mode === 'move' ? drag.cur : drag.mode === 'l' ? drag.cur : el.startTime)}
          {' · '}
          {tc(
            drag.mode === 'move'
              ? el.duration
              : drag.mode === 'l'
                ? drag.origStart + drag.origDur - drag.cur
                : drag.cur - el.startTime,
          )}
        </span>
      )}

      {/* trim handles — 12px hit strips, ew-resize (spec 05 §14.2) */}
      {!locked && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-3 rounded-l-[2px]"
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ mode: 'l', startX: e.clientX, origStart: el.startTime, origDur: el.duration, cur: el.startTime, alt: false });
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <div
            className="absolute inset-y-0 right-0 w-3 rounded-r-[2px]"
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (tool !== 'select') return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ mode: 'r', startX: e.clientX, origStart: el.startTime, origDur: el.duration, cur: el.startTime + el.duration, alt: false });
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </>
      )}

      {/* linked A/V badge (spec 05 §12.3) */}
      {el.linkedTo && (
        <span
          className="absolute right-1 top-1 flex items-center rounded-sm bg-black/55 px-1 py-px text-tprimary"
          title="Linked A/V"
          aria-label="Linked audio and video"
        >
          <Link2 size={10} strokeWidth={2.2} />
        </span>
      )}

      {/* effect badges (F/T/S/♪ — spec 18 §9) */}
      {el.effects?.some((f) => f.enabled) && (
        <span className="mono absolute left-1 top-1 rounded-sm bg-black/55 px-1 text-[11px] font-bold text-white">F</span>
      )}
    </div>
    </>
  );
}

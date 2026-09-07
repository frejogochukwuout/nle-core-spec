/* GradedViewerCanvas — R20-W4c (DESIGN-R20 D3; color-layout §3.6; gaps
   C52/C54). The color-page viewer surface: the <img> stand-in becomes a
   real CPU-graded <canvas> riding the SAME letterbox/zoom transport
   surface (the aspect-video frame + zoomStyle the Viewer owns).

   Pipeline (spec 08 §12 strategy, CPU): Image load → offscreen drawImage
   to ≤960×540 working res → ImageData (cached per mediaId — the §12.1
   linear cache) → gradeLinearFrame([clipGrade → timelineGrade] stack +
   curve LUTs + qualifier nodes) → putImageData. Re-grades on param/playhead
   changes are rAF-COOLESCED (scheduleCoalesced — one grade per frame);
   graded outputs ride W4a's GradedImageCache keyed
   elementId|stack-hash|src-hash. The graded buffer is PUBLISHED to the
   scope bus (gradedFrameBus) so the ScopesDock (R23-WB: the tabbed console
   in the timeline-area console row, D-B1) draws real traces from the exact
   frame the user sees.

   State rows (spec 18 §4.2 ported to the canvas path): loading skeleton
   while the still decodes, decode-failure + Retry (re-key re-attempt),
   offline media (m-04 can't decode — the honest row, never a crash).

   Qualifier (C54): qualifierPreviewOn overlays the green-tinted matte
   (sampleMatte on the graded buffer); the eyedropper (qualifierPickerOn)
   samples the clicked pixel's 3×3 HSL and SEEDS the target's qualifier
   Center values through setGrade (one undoable commit per pick; the pick
   disarms the picker).

   R20-W4c. The <img> stays the surface on every NON-color page (the
   program monitor is unchanged there — the honest boundary). */

import { useEffect, useRef, useState } from 'react';
import { useUi, gradeOf, resolveGradeTargetId, TIMELINE_GRADE_KEY } from '../../state/useUiStore';
import { mediaById } from '../../lib/mockData';
import {
  decodeToLinear,
  hashImageData,
  GradedImageCache,
  scheduleCoalesced,
  cancelCoalesced,
  DEFAULT_QUALIFIER,
  type LinearImage,
  type QualifierParams,
} from '../../lib/color';
import {
  workingResolution,
  buildGradeStack,
  gradeLinearFrame,
  hashGradeStack,
  sampleAverage3x3,
  qualifierSeedFromSample,
} from '../pages/color/gradedFrame';
import { drawQualifierMatte } from '../pages/color/scopeDraw';
import { publishGradedFrame } from '../pages/color/gradedFrameBus';

/* ------------------------------------------------------------------ *
 * Module-level caches (spec 08 §12; meterEngine singleton precedent) *
 * ------------------------------------------------------------------ */

interface DecodedSource {
  mediaId: string;
  linear: LinearImage;
  width: number;
  height: number;
  /** hashImageData of the source ImageData — the cache-key src half. */
  srcHash: string;
}

const DECODE_CACHE_MAX = 6; // 6 × ~2MB linear buffers
const decodedCache = new Map<string, DecodedSource>();
const frameCache = new GradedImageCache(8);

function cacheDecoded(entry: DecodedSource): void {
  if (decodedCache.has(entry.mediaId)) return;
  while (decodedCache.size >= DECODE_CACHE_MAX) {
    const oldest = decodedCache.keys().next();
    if (oldest.done) break;
    decodedCache.delete(oldest.value);
  }
  decodedCache.set(entry.mediaId, entry);
}

/** Test containment — drop both module caches (setup.ts resets the store;
 *  these singletons belong to this module). */
export function __resetGradedViewerCaches(): void {
  decodedCache.clear();
  frameCache.clear();
}

/** Decode a loaded image to the working-res linear buffer. */
function decodeLoadedImage(
  mediaId: string,
  image: HTMLImageElement,
): DecodedSource {
  const { width, height } = workingResolution(image.naturalWidth, image.naturalHeight);
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  return { mediaId, linear: decodeToLinear(data), width, height, srcHash: hashImageData(data) };
}

/* ------------------------------------------------------------------ */

export interface GradedViewerCanvasProps {
  /** Program mode: the under-playhead element's media; source: the asset. */
  mediaId: string | null;
  /** Program mode: the grade-owning element id; source mode: null. */
  elementId: string | null;
  mode: 'program' | 'source';
  /** Story/test hook — force the §4.2 decode-failure row with a broken src. */
  srcOverride?: string;
}

type Phase = 'loading' | 'ready' | 'error';

export function GradedViewerCanvas({ mediaId, elementId, mode, srcOverride }: GradedViewerCanvasProps) {
  const media = mediaId ? mediaById(mediaId) : undefined;
  const src = srcOverride ?? media?.thumbnail ?? '';
  const offline = media?.offline ?? false;
  /* audio assets carry no frame — the Viewer never mounts the canvas for
     them, but the component stays honest if asked directly */
  const hasFrame = !!src && media?.type !== 'audio';

  /* grade stack sources — program mode composes [clip → timeline] (the
     sequential law, color-layout §3.6); source mode is the raw ungraded
     poster (a pool asset has no element id → no grade, the honest row). */
  const clipGrade = useUi((s) => gradeOf(s, elementId ?? '__none__'));
  const timelineGrade = useUi((s) => gradeOf(s, TIMELINE_GRADE_KEY));
  /* the qualifier being EDITED (the console target — the Qualifier tab's
     H/S/L bars); the matte preview + eyedropper speak its values */
  const targetQualifier = useUi((s) => gradeOf(s, resolveGradeTargetId(s) ?? '__none__').qualifier);
  const qualifierPreviewOn = useUi((s) => s.qualifierPreviewOn);
  const qualifierPickerOn = useUi((s) => s.qualifierPickerOn);
  const pushToast = useUi((s) => s.pushToast);

  const [phase, setPhase] = useState<Phase>('loading');
  const [decoded, setDecoded] = useState<DecodedSource | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);

  /* ---- decode pass (spec 08 §12.1: cache the linear working texture) ---- */
  useEffect(() => {
    if (!mediaId || offline || !hasFrame) {
      setDecoded(null);
      setPhase('loading');
      return;
    }
    const cached = decodedCache.get(mediaId);
    if (cached) {
      setDecoded(cached);
      setPhase('ready');
      return;
    }
    setPhase('loading');
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        setPhase('error');
        return;
      }
      try {
        const entry = decodeLoadedImage(mediaId, image);
        cacheDecoded(entry);
        setDecoded(entry);
        setPhase('ready');
      } catch {
        setPhase('error');
      }
    };
    image.onerror = () => {
      if (cancelled) return;
      setPhase('error');
      pushToast({ kind: 'error', title: 'Media failed to decode', detail: 'graded preview decode failed — check the media pool (spec 18 §4.2)' });
    };
    image.src = src;
    return () => { cancelled = true; };
    // src follows mediaId (mockData thumbnails are static); reloadKey re-attempts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId, src, reloadKey, offline]);

  const retryDecode = () => setReloadKey((k) => k + 1);

  /* ---- grade pass (spec 08 §12.2: re-run ONLY this, coalesced) ---- */
  const coalesceKey = `graded-viewer:${mediaId ?? 'none'}:${elementId ?? 'src'}`;
  useEffect(() => {
    if (phase !== 'ready' || !decoded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    scheduleCoalesced(coalesceKey, () => {
      // the closure is REPLACED on re-schedules (latest-wins) — the deps
      // below re-arm it with the current grades every time. The ctx is
      // fetched at FIRE time from the CURRENT canvas (a retry/decode cycle
      // remounts the element — a memoized ctx would point at a dead canvas).
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const passes = mode === 'program'
        ? buildGradeStack(clipGrade, timelineGrade)
        : buildGradeStack(null, null); // source preview: raw, ungraded
      const stackHash = hashGradeStack(passes);
      const key = `${elementId ?? mediaId}|${stackHash}|${decoded.srcHash}`;
      let frame = frameCache.get(key);
      if (!frame) {
        frame = gradeLinearFrame(decoded.linear, passes);
        frameCache.put(key, frame);
      }
      if (canvas.width !== decoded.width) canvas.width = decoded.width;
      if (canvas.height !== decoded.height) canvas.height = decoded.height;
      ctx.putImageData(frame, 0, 0);
      // the matte overlay (C54): the TARGET's qualifier, evaluated on the
      // graded buffer the user sees (sampleMatte stride-samples it)
      const qual: QualifierParams = targetQualifier ?? DEFAULT_QUALIFIER;
      if (qualifierPreviewOn && mode === 'program') drawQualifierMatte(ctx, frame, qual);
      lastFrameRef.current = frame;
      publishGradedFrame({ imageData: frame, width: decoded.width, height: decoded.height, mediaId: decoded.mediaId, elementId: mode === 'program' ? elementId : null, mode });
    });
    return () => cancelCoalesced(coalesceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, decoded, clipGrade, timelineGrade, targetQualifier, qualifierPreviewOn, mode, elementId, mediaId]);

  /* ---- the eyedropper click-through (C54) ---- */
  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!qualifierPickerOn) return;
    const frame = lastFrameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    // object-contain mapping: element box → internal working-res bitmap
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / Math.max(1, canvas.width), rect.height / Math.max(1, canvas.height)) || 1;
    const offX = (rect.width - canvas.width * scale) / 2;
    const offY = (rect.height - canvas.height * scale) / 2;
    const x = Math.round((e.clientX - rect.left - offX) / scale);
    const y = Math.round((e.clientY - rect.top - offY) / scale);
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return; // a letterbox click — not a pixel
    const [r, g, b] = sampleAverage3x3(frame.data, frame.width, frame.height, x, y);
    const seed = qualifierSeedFromSample(r, g, b);
    const s = useUi.getState();
    const targetId = resolveGradeTargetId(s);
    if (targetId == null) {
      pushToast({ kind: 'info', title: 'Eyedropper needs a target', detail: 'select a clip (or switch the target to Timeline) before sampling a qualifier center' });
      return;
    }
    s.setGrade(targetId, { qualifier: seed });
    s.setQualifierPickerOn(false); // one-shot: the pick disarms the picker
  };

  /* ---- state rows (spec 18 §4.2, ported to the canvas path) ---- */
  if (!mediaId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
        No media — import or drop a file
      </div>
    );
  }
  if (offline) {
    return (
      <div data-testid="shell-viewer-canvas-offline" className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
        Media offline
      </div>
    );
  }
  if (!hasFrame) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
        Audio-only asset — no video frame
      </div>
    );
  }
  if (phase === 'loading') {
    return (
      <div data-testid="shell-viewer-state-loading" role="status" className="flex h-full w-full animate-pulse items-center justify-center bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
        Decoding {media?.name ?? 'media'} — working res ≤960×540…
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div data-testid="shell-viewer-state-error" role="alert" className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0a0a0c] text-[13px] text-[#9a9aa5]">
        <span>Media failed to decode — check the pool</span>
        <button type="button" onClick={retryDecode} className="underline decoration-dotted hover:text-white" aria-label="Retry decoding the program frame">
          Retry
        </button>
      </div>
    );
  }

  const label = mode === 'source'
    ? `Ungraded source preview: ${media?.name ?? 'media'}`
    : `Graded program preview: ${media?.name ?? 'media'}${elementId ? ` (${elementId})` : ''}`;

  return (
    <div className="relative h-full w-full">
      {/* object-contain (not the <img> path's object-cover): the colorist
          sees the WHOLE frame and the eyedropper's contain mapping is exact —
          README-registered deviation from the program <img> surface. */}
      <canvas
        ref={canvasRef}
        data-testid="shell-viewer-canvas"
        role="img"
        aria-label={label}
        className="h-full w-full object-contain"
        style={{ cursor: qualifierPickerOn ? 'crosshair' : undefined, outline: qualifierPickerOn ? '1px solid var(--accent-selection)' : undefined, outlineOffset: '-1px' }}
        onClick={onCanvasClick}
      />
      {mode === 'source' && (
        <span
          data-testid="shell-viewer-canvas-raw-chip"
          className="mono pointer-events-none absolute bottom-2 left-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
        >
          raw source — no grade (color-layout §3.6)
        </span>
      )}
      {mode === 'program' && qualifierPickerOn && (
        <span
          data-testid="shell-viewer-canvas-picker-hint"
          className="mono pointer-events-none absolute right-2 top-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
        >
          click a pixel to sample the qualifier center
        </span>
      )}
    </div>
  );
}

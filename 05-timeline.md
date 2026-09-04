# 05 — Timeline: UI, Data Model, Virtualization, Interactions

**Stream:** Timeline component (DOM-based, virtualized)
**Status:** Refined by sub-agent scout (SCOUT-05) — open questions answered with source code references. Round-8 amendments: §5.2 zoom reworded (implementable multiplier model), §8.3 drag contract notes + canonical move shape, §9 screen-space snap threshold, §14.5A magnetic zero-anchor (all absorbed from the opencut-timeline reference), §16.5 opencut-timeline code-reference table. **Round-15 amendments:** §11.1 markers per-scene + ruler-seeks (A2/N10), §11.2 InOutPoints superseded by setLoop halves (N12), §5.2 zoom-ladder mock registration (N13/C28), §16.5A projector clauses (ARCH-R15 §2.2) — per `.agents/SPEC-REVISION-CANDIDATES.md`
**Primary teacher:** OpenCut-classic DOM approach + FreeCut's per-element NLE op UI
**Spec file:** `05-timeline.md` (single canon file — renamed from `.refined.md` in R9 per 00-master §2.5; seed text recoverable in git history)
**Reference repos audited:** `/tmp/opencut-classic` (archived MIT), `/tmp/freecut` (MIT); **opencut-timeline** (github.com/bearachprema/opencut-timeline, landed Round 8) is the live executable code reference for this stream's algorithmic core (components pending its W4); see spec 19 §3.2 and §16.5 below.

---

## 1. Purpose

Define the timeline UI: how tracks and clips are rendered, how the user interacts with them (drag, trim, scrub), and how the UI stays fast with hundreds of clips. This stream is mostly UI; the underlying NLE op logic is in `06-nle-ops.md`. The DOM-timeline patterns below (component hierarchy, controllers, placement, snapping) have a live executable port — **opencut-timeline** (landed Round 8; see §16.5 and spec 19 §3.2) — cite it (plus OpenCut-classic for the components its W4 has not landed yet), not the monorepo, when implementing.

---

## 2. Goals

1. **Intuitive.** The user noted OpenCut-classic "feels more intuitive" — we adopt its DOM-based approach.
2. **Responsive.** 60fps UI with 500+ clips on the timeline.
3. **Virtualized.** Only render visible clips + a buffer; recycle DOM nodes.
4. **Accessible.** Keyboard navigation, screen reader labels.
5. **Decoupled from engine.** UI subscribes to `ScenesManager` (spec 01 §3.3 — note: plural) for state; issues ops via `engine.command.apply(EngineCommand)` (spec 15 §4, Decision 9).

---

## 3. Why DOM, Not Canvas

Both reference repos render the timeline, but differently:

| | FreeCut | OpenCut-classic |
|---|---|---|
| Tracks / clips | DOM (React) | DOM (React) |
| Ruler | Canvas | DOM |
| Filmstrip thumbnails | Canvas (tiled) | DOM/CSS `backgroundImage` tiling (no wavesurfer.js) |
| Audio waveforms | Canvas | Canvas |
| Density mode | Hybrid DOM + canvas aggregator | None |

We adopt OpenCut-classic's approach: **DOM everywhere — including filmstrip thumbnails, which OpenCut-classic renders via DOM/CSS `backgroundImage` tiling (`TiledMediaContent` at `timeline-element.tsx:1084-1133`, not Canvas).** Canvas is reserved for waveform rendering only (where both repos agree Canvas 2D is the right tool). This matches the user's "intuitive" preference.

> **Note on filmstrip approach:** OpenCut-classic uses DOM/CSS `backgroundImage` for filmstrip (works well up to a few hundred thumbnails per viewport, browser handles compositing). FreeCut uses Canvas-tiled filmstrip for higher-density timelines (its density mode kicks in at 80+ items/track — see §17.3). For our v1 we adopt OpenCut-classic's simpler DOM/CSS approach; revisit Canvas-tiled filmstrip if profiling shows DOM filmstrip becoming a bottleneck.

**Why DOM:**
- Easier to develop (DevTools, inspectable)
- Easier to make accessible (ARIA, keyboard nav)
- Easier to style (CSS, Tailwind)
- Fast enough for typical timelines (500 clips, virtualized)
- Browser handles hit-testing, scrolling, focus for free

**Why canvas for waveforms:**
- Waveforms are continuous filled paths (one `<canvas>` per audio clip draws a smooth curve) — much cheaper than thousands of `<rect>` DOM nodes
- Pixel-dense rendering — canvas is more efficient
- Already produced as `Float32Array` from audio decode workers

---

## 4. Timeline Component Hierarchy

```
<Timeline>
  ├─ <TimelineToolbar>           (tools: select, razor, ripple mode toggle, snap toggle)
  ├─ <TimelineHeader>             (track headers, sequence tabs)
  ├─ <TimelineContent>
  │   ├─ <TimelineRuler>          (DOM-based, time markers)
  │   ├─ <TimelinePlayhead>       (vertical line, draggable)
  │   ├─ <TimelineTracks>
  │   │   └─ {tracks.map(track => 
  │   │       <TimelineTrack>
  │   │         ├─ <TrackHeader>  (mute/solo/lock, name)
  │   │         └─ <TrackBody>
  │   │             └─ {elements.map(el => 
  │   │                 <TimelineElement>
  │   │                   ├─ <ClipFilmstrip>   (canvas, virtualized)
  │   │                   ├─ <ClipWaveform>    (canvas, audio only)
  │   │                   ├─ <ClipLabel>        (name, duration)
  │   │                   ├─ <TrimHandles>      (left/right)
  │   │                   └─ <ClipEffects>      (transition icons, etc.)
  │   │               )}
  │   │             </TimelineTrack>
  │   │           )}
  │   ├─ <SnapGuides>             (visual snap indicators during drag)
  │   ├─ <Marquee>                 (selection rectangle)
  │   └─ <DropZones>               (visual feedback during drag-drop)
  ├─ <TimelineNavigator>          (zoom, scroll overview)
  └─ <TimelineStatusBar>          (selection info, total duration)
</Timeline>
```

> The tree above mounts inside the UI shell's timeline area (spec 18): `#timeline-area` = `#track-headers` (fixed 160px column, hosts `TrackHeader`/§10) + `#timeline-scroll` (hosts `TimelineContent`); the tool toggles in `TimelineToolbar` bind to the same tool-mode enum as spec 18's timeline toolbar.

### 4.1 Component responsibilities

| Component | Responsibility |
|---|---|
| `Timeline` | Top-level, owns layout, owns zoom/scroll state (UI prefs) |
| `TimelineToolbar` | Tool selection, mode toggles |
| `TimelineHeader` | Track column headers, sequence tabs |
| `TimelineContent` | The scrollable area, owns viewport |
| `TimelineRuler` | Time markers, click-to-seek |
| `TimelinePlayhead` | Vertical line, drag-to-scrub |
| `TimelineTracks` | Track container |
| `TimelineTrack` | One track row |
| `TimelineElement` | One clip on the timeline |
| `ClipFilmstrip` | Canvas rendering of filmstrip thumbnails |
| `ClipWaveform` | Canvas rendering of audio waveform |
| `TrimHandles` | Left/right trim drag handles |
| `SnapGuides` | Visual feedback during drag |
| `Marquee` | Multi-select rectangle |
| `DropZones` | Visual feedback during drag-drop |

**Reference:** OpenCut-classic `apps/web/src/timeline/components/index.tsx` (954 LOC, the `Timeline` function). ✅ Read in full — see §14.1.

---

## 5. Zoom & Scroll

### 5.1 Zoom state

```ts
interface TimelineViewState {
  pixelsPerSecond: number;  // zoom level
  scrollLeft: number;
  scrollTop: number;
  selectedElementIds: Set<string>;
  selectedTrackIds: Set<string>;
  rippleMode: boolean;
  snapEnabled: boolean;
  expandedElementIds: Set<string>;  // for clips with keyframes/effects expanded
}

// Stored in Zustand (UI prefs only — engine doesn't care)
const useTimelineViewStore = create<TimelineViewState>((set, get) => ({
  // ...
}));
```

### 5.2 Zoom levels

**Round-8 rewording:** the previous formulation ("Min: 1 pixel per second … Max: 100 pixels per frame") is not implementable as a zoom-multiplier bound — a px/frame cap is a derived quantity, not a zoom input. The implementable model (verified executable in opencut-timeline `view/scale.ts` + `view/zoom-utils.ts`, our reference for this section — see §16.5):

- Zoom is a multiplier over `BASE_TIMELINE_PIXELS_PER_SECOND = 50` (so default zoom = 1.0 ≡ the old "50 pixels per second" rough-cut default)
- `TIMELINE_ZOOM_MIN` is **dynamic** — the zoom-to-fit level of the current scene (never larger than the content, so the whole timeline is always reachable); the static floor is `0.1` (5 px/s)
- `TIMELINE_ZOOM_MAX = 100` (5,000 px/s ≈ 208 px/frame at 24 fps — comfortably frame-accurate; the old "100 px/frame" intent)
- The zoom slider maps to the multiplier **exponentially** (`sliderToZoom`/`zoomToSlider`), not linearly, so perceived zoom speed is uniform across the range
- Playhead-anchored zoom above a 15% slider position, scroll-anchored below (OpenCut-classic `zoom-controller.ts` pattern, §16.1)
- Derived invariant: at any zoom, `pixelToTime(timeToPixel(t))` round-trips to the same frame after DPR snapping (`snapPixelToDeviceGrid`, §16.5) — this is the frame-accuracy guarantee the old formulation was reaching for
- **(Round 15 amendment, N13 — registration, not a spec change):** the ui-mock ships 8–240 px/s as its zoom ladder — a REGISTERED mock simplification (C28), not a ruling. This spec's ladder stands: dynamic zoom-to-fit minimum over the 5 px/s static floor, 100× max (5,000 px/s). **Frame-accurate editing at max zoom is the requirement** — the mock's coarse ladder exercises frame-grid discipline only at coarse zoom, so the app (not the spec) owns closing that gap at the seal/A-rounds.

### 5.3 Time ↔ pixel conversion

```ts
function timeToPixel(time: MediaTime, pixelsPerSecond: number): number {
  return (mediaTimeToSeconds({ time }) * pixelsPerSecond);
}

function pixelToTime(pixels: number, pixelsPerSecond: number): MediaTime {
  return mediaTimeFromSeconds({ seconds: pixels / pixelsPerSecond });
}

function frameToPixel(frame: number, fps: FrameRate, pixelsPerSecond: number): number {
  return timeToPixel(mediaTimeFromFrame({ frame, rate: fps }), pixelsPerSecond);
}
```

---

## 6. Virtualization

### 6.1 Horizontal virtualization (time axis)

Only render clips whose visible time range overlaps the viewport:

```ts
function useVisibleElements(track: Track, viewport: { start: MediaTime; end: MediaTime }): TimelineElement[] {
  return useMemo(() => {
    return track.elements.filter(el => {
      const elStart = el.startTime;
      const elEnd = mediaTimeAdd(el.startTime, el.duration);
      return elStart <= viewport.end && elEnd >= viewport.start;
    });
  }, [track, viewport]);
}
```

Add a buffer (e.g., 1 screen of pixels on each side) to avoid popping during scroll.

### 6.2 Vertical virtualization (tracks)

For timelines with 50+ tracks, virtualize vertically too:

```ts
function useVisibleTracks(tracks: Track[], viewport: { top: number; bottom: number }): Track[] {
  // Only render tracks whose visible row range overlaps the viewport
  // ...
}
```

In practice, timelines rarely have more than 10-15 tracks — vertical virtualization is a stretch goal.

### 6.3 DOM node recycling

Neither reference repo uses TanStack Virtual / `react-virtual` / `react-window` for timeline virtualization — both roll their own (OpenCut-classic: none; FreeCut: custom `useVisibleItems` hook at `FC/hooks/use-visible-items.ts`, 873 LOC — see §14.9 and §17.2 for the algorithm). We follow the same pattern: hand-roll a simple virtualizer driven by `useTimelineViewportStore` + frame-range math, rather than introducing a third-party virtualization dependency.

**Reference:** OpenCut-classic has no virtualization layer for clips/tracks (only ruler ticks are windowed — see `timeline-ruler.tsx:50-98`). FreeCut uses a custom `useVisibleItems` hook — see §14.9 and §17.2 for the algorithm. Verified: `grep -r "tanstack|react-virtual|useVirtualizer|react-window" /tmp/opencut-classic/apps/web/src/timeline /tmp/freecut/src/features/timeline` returns zero matches in timeline code (FreeCut does use `@tanstack/react-virtual` in its editor properties sidebar, but not in the timeline).

---

## 7. Clip Rendering

### 7.1 Filmstrip (canvas)

For video clips, show a strip of thumbnails:

```tsx
function ClipFilmstrip({ element, mediaId, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Calculate which thumbnails to show based on width
    const thumbWidth = 80;  // pixels
    const numThumbs = Math.ceil(width / thumbWidth);
    const startTime = element.startTime;
    const endTime = mediaTimeAdd(element.startTime, element.duration);
    const timePerThumb = mediaTimeFromSeconds({ seconds: (mediaTimeToSeconds({ time: mediaTimeSub(endTime, startTime) })) / numThumbs });
    
    // Request thumbnails from filmstrip worker (cache hit common)
    const thumbs: Promise<ImageBitmap>[] = [];
    for (let i = 0; i < numThumbs; i++) {
      const time = mediaTimeAdd(startTime, mediaTimeFromSeconds({ seconds: i * mediaTimeToSeconds({ time: timePerThumb }) }));
      thumbs.push(filmstripService.getThumbnail(mediaId, time, { width: thumbWidth, height }));
    }
    
    Promise.all(thumbs).then(bitmaps => {
      const ctx = canvas.getContext('2d');
      bitmaps.forEach((bmp, i) => ctx.drawImage(bmp, i * thumbWidth, 0, thumbWidth, height));
    });
  }, [element, mediaId, width, height]);
  
  return <canvas ref={canvasRef} width={width} height={height} />;
}
```

**Performance considerations:**
- Thumbnails are cached (keyed by `mediaId:time`)
- Only request thumbnails for visible portion (use viewport intersection)
- Reuse `ImageBitmap` across re-renders (don't recreate)
- For very wide clips (>100 thumbnails), subsample or use a lower-density strip

### 7.2 Waveform (canvas)

For audio clips:

```tsx
function ClipWaveform({ element, mediaId, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Request waveform peaks from waveform worker
    waveformService.getPeaks(mediaId, element.startTime, mediaTimeAdd(element.startTime, element.duration), width).then(peaks => {
      const ctx = canvas.getContext('2d');
      // Draw waveform from peaks (Float32Array of min/max pairs)
      drawWaveform(ctx, peaks, width, height);
    });
  }, [element, mediaId, width, height]);
  
  return <canvas ref={canvasRef} width={width} height={height} />;
}

function drawWaveform(ctx: CanvasRenderingContext2D, peaks: Float32Array, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#4ade80';  // green
  const mid = height / 2;
  for (let x = 0; x < width; x++) {
    const min = peaks[x * 2] || 0;
    const max = peaks[x * 2 + 1] || 0;
    ctx.fillRect(x, mid - max * mid, 1, (max - min) * mid);
  }
}
```

### 7.3 Clip visual structure

```tsx
function TimelineElement({ element, track, isSelected }: Props) {
  const left = timeToPixel(element.startTime, pixelsPerSecond);
  const width = timeToPixel(element.duration, pixelsPerSecond);
  
  return (
    <div
      className={cn('timeline-element', { selected: isSelected })}
      style={{ left: `${left}px`, width: `${width}px` }}
      role="button"
      aria-label={`${element.name}, ${formatTimecode(element.startTime)}`}
    >
      {element.type === 'video' && <ClipFilmstrip element={element} mediaId={element.mediaId} width={width} height={60} />}
      {element.type === 'audio' && <ClipWaveform element={element} mediaId={element.mediaId} width={width} height={60} />}
      {element.type === 'text' && <ClipLabel element={element} />}
      <ClipLabel element={element} />
      <TrimHandles element={element} />
      {element.transition && <TransitionIndicator transition={element.transition} />}
    </div>
  );
}
```

---

## 8. Interactions

### 8.1 Tool modes

```ts
type ToolMode = 'select' | 'razor' | 'hand' | 'zoom';
```

| Tool | Behavior |
|---|---|
| `select` | Default — click to select, drag to move, edge-drag to trim |
| `razor` | Click to split clip at cursor position |
| `hand` | Drag to pan timeline |
| `zoom` | Drag to zoom into region |

### 8.2 Click → select

```ts
function handleClick(e: React.MouseEvent, element: TimelineElement) {
  const additive = e.shiftKey || e.metaKey;
  if (additive) {
    // Toggle selection
    setSelected(prev => new Set([...prev, element.id]));
  } else {
    setSelected(new Set([element.id]));
  }
}
```

### 8.3 Drag → move

**Round-8 contract notes (absorbed from opencut-timeline — §16.5, its three-round review cadence, and the M11/M16 boundary tests):**

1. **Coordinate-space discipline.** `e.clientX/clientY` are viewport-space; any element-relative math (edge hit-zones, `elementRectLeft`) must use `getBoundingClientRect().left` of the track-content element, NOT the scroll-adjusted offset. Mixing the two spaces is the single most common drag-bug class (opencut-timeline SKILL gotcha #3; their controllers inject `elementRectLeft` as a config value for exactly this reason).
2. **Drag threshold: `TIMELINE_DRAG_THRESHOLD_PX = 5`, strict `>`.** A pointer-down + up below the threshold is a **click** (selection), not a drag. The boundary is tested at exactly 5px (must NOT fire the drag) — the `>=` vs `>` distinction is load-bearing.
3. **Mixed audio+video drag groups are rejected entirely** (no partial application — either the whole group moves or none), per spec 15 §4.3.3's cross-section constraint and opencut-timeline's group-level rejection (M16).
4. **Main-track zero-anchor is enforced on the commit path** — a group-move that would push the sole main-track element off time 0 is clamped (see §14.5A); the raw `move` command remains the escape hatch for programmatic callers.

The canonical wire shape for a same-track drag commit is `move` with `elementIds + delta + targetTrackId: null` (spec 15 §4.3.3); a cross-track group drag uses `movePlan: PlannedElementMove[]` — one entry per element, exact shape in spec 15. The commit below shows both:

```ts
function useTimelineDrag() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  function startDrag(e: React.MouseEvent, elementIds: string[]) {
    const startX = e.clientX;  // viewport space (contract note 1)
    const startTime = getSelectedStartTime();
    
    setDragState({ elementIds, startX, startTime, currentDelta: 0, threshold: 5 });
    
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      // Below threshold: still a pending click, not a drag (contract note 2)
      if (Math.abs(delta) <= 5) return;
      const deltaTime = pixelToTime(delta, pixelsPerSecond);
      
      // Snap
      const snappedTime = snapEnabled ? snap(startTime + deltaTime, snapPoints) : startTime + deltaTime;
      const snappedDelta = snappedTime - startTime;
      
      setDragState(prev => prev ? { ...prev, currentDelta: snappedDelta } : null);
    };
    
    const onUp = () => {
      if (dragState && dragState.currentDelta !== 0) {
        // Commit via the canonical dispatcher (spec 15 §4.3.3).
        // Same-track group drag: delta form. engine.timeline.moveElements
        // (the manager method, spec 01 §3.3) takes the movePlan internally —
        // the WIRE command is the single-element family + delta below.
        engine.command.apply({
          type: 'move',
          params: {
            elementIds: dragState.elementIds,
            delta: dragState.currentDelta,
            targetTrackId: null,  // same-track drag; cross-track → movePlan instead
          },
        });
      }
      setDragState(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  
  return { dragState, startDrag };
}
```

> Preview during drag goes through `previewElements` (spec 06 §4.6) — no per-frame command pushes; exactly one `move` command lands on the undo stack per gesture (one undo step per user intent).

### 8.4 Trim handles

Left/right trim handles on each clip:

```tsx
function TrimHandles({ element }: Props) {
  const startTrim = useTrim(element.id, 'start');
  const endTrim = useTrim(element.id, 'end');
  
  return (
    <>
      <div className="trim-handle left" onMouseDown={startTrim.start} />
      <div className="trim-handle right" onMouseDown={endTrim.start} />
    </>
  );
}
```

The `useTrim` hook (adapted from FreeCut's `hooks/use-timeline-resize.ts`):

```ts
function useTrim(elementId: string, edge: 'start' | 'end') {
  function start(e: React.MouseEvent) {
    e.stopPropagation();
    const startX = e.clientX;
    const originalStart = getElement(elementId).startTime;
    const originalDuration = getElement(elementId).duration;
    
    const onMove = (e: MouseEvent) => {
      const delta = pixelToTime(e.clientX - startX, pixelsPerSecond);
      const trimmed = computeTrim({
        edge, delta, originalStart, originalDuration,
        sourceDuration: getSourceDuration(elementId),
        snapPoints,
      });
      // Live preview (local state, not committed yet)
      setPreview(trimmed);
    };
    
    const onUp = () => {
      // Commit via the canonical dispatcher (spec 15 §4.2: the `trim` command
      // takes {elementId, edge, delta}; the resolver computes delta from the
      // preview's absolute trimStart/trimEnd — see spec 01 §3.3 / §14.5).
      engine.command.apply({
        type: 'trim',
        params: { elementId, edge, delta: preview.trimStart - originalTrimStart },
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  
  return { start };
}
```

### 8.5 Razor (split)

In razor mode, click to split:

```ts
function handleRazorClick(e: React.MouseEvent, track: Track) {
  const time = pixelToTime(e.clientX - contentOffset, pixelsPerSecond);
  // Read via ScenesManager, commit via the canonical dispatcher (spec 15 §4.2:
  // the `split` command maps to engine.timeline.splitElements, which takes an
  // `elements` array + `splitTime` and returns the right-side element refs).
  const elementsAtTime = engine.scenes.getActiveScene().elementsAtTime(time, track.id);  // read via ScenesManager
  engine.command.apply({ type: 'split', params: { time, trackIds: [track.id] } });  // spec 15 §4.2 (manager method: engine.timeline.splitElements)
```

### 8.6 Playhead drag

```ts
function TimelinePlayhead() {
  function startDrag(e: React.MouseEvent) {
    const onMove = (e: MouseEvent) => {
      const time = pixelToTime(e.clientX - contentOffset, pixelsPerSecond);
      engine.playback.seek(time);
    };
    
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  
  const currentTime = usePlaybackTime();
  const left = timeToPixel(currentTime, pixelsPerSecond);
  
  return <div className="playhead" style={{ left: `${left}px` }} onMouseDown={startDrag} />;
}
```

### 8.7 Marquee selection

```ts
function useMarquee() {
  const [rect, setRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  
  function start(e: React.MouseEvent) {
    setRect({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
    
    const onMove = (e: MouseEvent) => {
      setRect(prev => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);
    };
    
    const onUp = () => {
      // Compute selected elements based on rect intersection
      const selected = computeMarqueeSelection(rect);
      setSelected(selected);
      setRect(null);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  
  return { rect, start };
}
```

### 8.8 Drag-drop from library

```ts
function handleDrop(e: React.DragEvent, targetTrack: Track, targetTime: MediaTime) {
  e.preventDefault();
  const mediaId = e.dataTransfer.getData('mediaId');
  // Real API: insertElement takes a pre-constructed `element` (with id,
  // mediaId, startTime, duration, trimStart, trimEnd) plus a `placement`
  // ({trackId, index?}) — see spec 01 §3.3 / §14.5. The element construction
  // (resolving mediaId → MediaAsset, computing duration, etc.) happens in a
  // MediaManager helper upstream.
  const element = engine.media.createElementFromMedia({ mediaId, trackId: targetTrack.id, startTime: targetTime });
  engine.command.apply({ type: 'insert', params: { element, placement: { trackId: targetTrack.id } } });  // spec 15 §4.2 (manager method: engine.timeline.insertElement)
}
```

### 8.9 Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play/pause |
| `J/K/L` | Reverse / pause / forward (shuttle) |
| `I/O` | Set in/out point |
| `A/S` | Snap on/off toggle |
| `R` | Ripple mode toggle |
| `B` | Razor tool |
| `V` | Select tool |
| `H` | Hand tool |
| `Z` | Zoom tool |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / redo |
| `Cmd+C` / `Cmd+V` | Copy / paste |
| `Cmd+X` | Cut (ripple delete) |
| `Delete` | Delete |
| `Backspace` | Ripple delete |
| `Left/Right` | Frame back / forward |
| `Shift+Left/Right` | 10 frames back / forward |
| `Cmd+Left/Right` | Go to start / end |
| `+/-` | Zoom in / out |
| `Cmd+0` | Reset zoom |

---

## 9. Snap Points

During drag/trim, snap to:
- Other clips' edges (start/end)
- Playhead position
- In/out points
- Markers
- Frame boundaries (always)
- Custom intervals (e.g., every 5 seconds, every 1 minute)

```ts
interface SnapPoint {
  time: MediaTime;
  label: string;
}

function computeSnapPoints(state: SceneState, viewport: TimeRange): SnapPoint[] {
  const points: SnapPoint[] = [];
  
  // Frame boundaries (computed lazily on demand — too many to precompute)
  // Other clips
  for (const track of state.tracks) {
    for (const el of track.elements) {
      points.push({ time: el.startTime, label: `${el.name} start` });
      points.push({ time: mediaTimeAdd(el.startTime, el.duration), label: `${el.name} end` });
    }
  }
  // Playhead
  points.push({ time: engine.playback.getCurrentTime(), label: 'Playhead' });
  // Markers
  for (const marker of state.markers) {
    points.push({ time: marker.time, label: marker.name });
  }
  // Filter to viewport + threshold
  return points.filter(p => Math.abs(mediaTimeToSeconds({ time: mediaTimeSub(p.time, viewport.center) })) < SNAP_THRESHOLD_SECONDS);
}
```

**FreeCut reference:** `src/features/timeline/utils/timeline-snap-utils.ts`, `src/features/timeline/utils/razor-snap.ts`, `src/features/timeline/preview/components/snap-guides.tsx`. ✅ All three read — see §14.6 and §14.12.

**Round-8 threshold rule (canonical):** the snap threshold is defined in **screen space** and converted to time via zoom, exactly as OpenCut-classic and the opencut-timeline port do: `thresholdTicks = (SNAP_THRESHOLD_PX / pixelsPerSecond) × TICKS_PER_SECOND` with `SNAP_THRESHOLD_PX = 10` (`snapping/threshold.ts`, §14.6/§16.5). This replaces any fixed `SNAP_THRESHOLD_SECONDS` reading: a constant-time threshold would feel magnetic at high zoom and dead at low zoom. Closest snap point wins (`resolveTimelineSnap` linear scan, §14.6); ties resolve to the earlier time. Snap sources are lazy iterables recomputed per query, with the dragged element's own edges excluded.

---

## 10. Track Headers

```tsx
function TrackHeader({ track }: Props) {
  return (
    <div className="track-header">
      <span className="track-name">{track.name}</span>
      <div className="track-controls">
        <button onClick={() => engine.command.apply({ type: 'toggleTrackMute', params: { trackId: track.id } })}>M</button>
        <button onClick={() => engine.command.apply({ type: 'toggleTrackSolo', params: { trackId: track.id } })}>S</button>
        <button onClick={() => engine.command.apply({ type: 'toggleTrackLock', params: { trackId: track.id } })}>L</button>
        <button onClick={() => engine.command.apply({ type: 'toggleTrackVisibility', params: { trackId: track.id } })}>V</button>
      </div>
    </div>
  );
}
```

For audio tracks: M/S/L (no V). For video tracks: M/V/L (no S, or S if we support solo-video). For text/overlay tracks: M/V/L.

Spec 18 fixes the header column at 160px (DaVinci mock `#track-headers`); OpenCut-classic's `TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX = 112` (§16.1) is the teacher value — 160px is the shell-canonical value.

---

## 11. Markers & In/Out Points

### 11.1 Markers

User can place markers (with optional labels) at any time:

```ts
interface Marker {               // (Round 15 amendment, A2) per-scene — see 09 §3.1A
  id: string;
  time: MediaTime;
  label?: string;
  color?: string;
}
```

**(Round 15 amendment, A2 + N10):** markers are stored **per scene** (`SceneJSON.markers` — 09 §3.1A's unified ruling: one `Marker` type, Bookmark absorbed, project-level home retired). Plain click or drag on the ruler **seeks** (§4.1's `TimelineRuler` click-to-seek; §8.6's drag contract) — the seed's "click on ruler to add marker" claim is RETIRED. Markers are added via `M` (16 §3.7), the toolbar's marker button + color presets, the command palette, and 18 §4.9's ruler menu.

### 11.2 In/Out points

**(Round 15 amendment, N12 — SUPERSEDED):** the dedicated `InOutPoints` model (was here: `{in, out}` + `I`/`O` to set, `G` to clear) is struck — in/out points are the two halves of the loop window: `setLoop` (15 §4.3.29), keyed `I`/`O`, cleared via ⌘⇧I/⌘⇧O halves and ⌥X both (16 §3.1's note; 18 §4.3/§4.9). Zero width = no-op loop; `end > start` is the validation invariant (N5). No persisted shape — 09 §3.1A's N12/N5 note.

---

## 12. Multi-track Display

### 12.1 Track ordering

Using `SceneTracks` type:

```
Overlay tracks (top to bottom):  [overlay-2] [overlay-1]
Main video (single):              [main]
Audio tracks (top to bottom):    [audio-1] [audio-2]
```

Visual stacking:
- Overlay tracks render on top of main
- Main renders below overlays
- Audio tracks render below main (audio-only, doesn't composite with video)
- Tracks within overlay/audio are ordered by their position in the array

### 12.2 Track height

- Video tracks: 80px (room for filmstrip)
- Audio tracks: 60px (room for waveform)
- Overlay tracks: 60px
- Collapsed tracks: 24px (just the header)

### 12.3 Linked selection

When a video element has a linked audio element (e.g., from a camera clip with audio), selecting one selects both. Visual indicator (linked chain icon).

---

## 13. Performance Considerations

### 13.1 React rendering

- Use `React.memo` for `TimelineElement` — only re-render when its element changes
- Use `React.useMemo` for `timeToPixel` / `pixelToTime` computations
- Use `useState` sparingly — prefer `useReducer` for complex state
- Use `zustand` for cross-component state (selection, zoom, scroll) — selector-based subscriptions prevent re-renders

### 13.2 Canvas performance

- Reuse canvas contexts (don't `getContext` every render)
- Use `OffscreenCanvas` if available (we don't need to — we're not in a worker)
- Avoid `putImageData` for large images — use `drawImage` with `ImageBitmap`

### 13.3 Drag performance

- During drag, use `requestAnimationFrame` to throttle DOM updates
- Don't re-render the whole timeline on every mousemove — only update the dragged element(s)
- Use CSS transforms (`translateX`) instead of `left` for dragged elements (compositor-friendly)

### 13.4 Scroll performance

- Use `passive: true` on scroll listeners
- Use `useSyncExternalStore` over a viewport store (scroll-math, like FreeCut's `use-clip-visibility.ts`) for virtualization triggers — not `IntersectionObserver` per clip, and not raw scroll-event listeners (see §17.1)
- Use `ResizeObserver` for layout changes

---

## 14. Open Questions — Resolved (SCOUT-05)

Each numbered question below corresponds to the original §14 entry in the seed spec. Every answer is backed by a real file path and quoted code. Reference repo paths are abbreviated: **OC** = `/tmp/opencut-classic/apps/web/src/`, **FC** = `/tmp/freecut/src/features/timeline/`.

### 14.1 OpenCut-classic `timeline/components/index.tsx` — full audit

**File:** `OC/timeline/components/index.tsx` (954 LOC, verified).

- **Component hierarchy.** A single `Timeline()` React component is the composition root (`OC/timeline/components/index.tsx:117`). It composes (in render order): `<TimelineToolbar>` (`:439`), `<TrackLabelsPanel>` (`:446`), the ruler scroll container wrapping `<TimelineRuler>` + `<TimelineBookmarksRow>` (`:474-501`), a `<ScrollArea>` for the tracks content (`:503-573`) containing `<TimelineTrackRows>` (`:547`), `<TimelinePlayhead>` (`:575`), `<SnapIndicator>` (`:588`), `<DragLine>` for both library-drop and element-drag targets (`:461-472`), and `<SelectionBox>` for marquee (`:458`).
- **State management.** Three sources: (a) `useEditor()` from `@/editor/use-editor` (`:125`) for engine state; (b) `useTimelineStore` (Zustand) for UI-only state like `snappingEnabled`, `expandedElementIds`, `rippleEditingEnabled` (`:118`, `:191`); (c) local `useState` for transient UI like `currentSnapPoint` (`:150`). The `useEditor((e) => e.scenes.getActiveSceneOrNull())` pattern (`:127-129`) is the canonical reactive subscription to engine state.
- **Render strategy.** Tracks are computed as a single flat array: `[...scene.tracks.overlay, scene.tracks.main, ...scene.tracks.audio]` (`:130-136`, also `:617-620`, `:758-761`). Each track is rendered absolutely positioned (`TimelineTrackRows`, `:805-886`) using `top: getCumulativeHeightBefore(...)` and `height: getTrackHeight + getExpansionHeight` (`:816-817`). Elements inside each track are absolutely positioned within their track container (`TimelineTrackContent`, `OC/timeline/components/timeline-track.tsx:50-114`). The playhead is also absolutely positioned (`OC/timeline/components/timeline-playhead.tsx:106-134`).
- **Scroll coordination.** A single non-passive `wheel` capture listener owns all wheel input (`:234-294`). It distinguishes zoom (Ctrl/Meta), horizontal scroll (Shift or `deltaX > deltaY`), and vertical scroll, and imperatively pushes `scrollLeft` to `rulerScrollRef` and `scrollTop` to `trackLabelsScrollRef` via `syncFollowers()` (`:221-230`) to keep ruler/labels/track-area locked in lockstep without React re-renders.
- **`useEditor()` integration.** The hook returns a stable `editor` proxy; every access is a reactive subscription (e.g., `editor.timeline.getTotalDuration()` (`:167`) is called outside `useEditor()`'s selector form, but `editor.playback.getCurrentTime()` for the playhead component (`OC/timeline/components/timeline-playhead.tsx:71`) reads directly. Commands are dispatched via `editor.timeline.*` methods (e.g., `editor.timeline.toggleTrackMute`, `:681-684`; `editor.timeline.moveElements`, used by `use-element-interaction.ts:60`).

### 14.2 OpenCut-classic `timeline/components/timeline-track.tsx` and `timeline-element.tsx`

- **`TimelineTrackContent`** (`OC/timeline/components/timeline-track.tsx:36-114`). Pure rendering: maps `track.elements` to `<TimelineElement>` (`:83-110`), each receiving `zoomLevel`, `isSelected`, `dragView`, `isDropTarget`. Click handling is delegated to a wrapping `<button>` (`:52-64`) that handles keyboard track selection via ARIA. **No IntersectionObserver virtualization is used here** — track-level virtualization is implicit because only mounted tracks (5–20 rows typical) render. ❌ **Seed spec assumption "IntersectionObserver virtualization" was not found in OpenCut-classic's timeline-track.tsx.** The OpenCut-classic timeline virtualizes the **ruler ticks** only, not tracks or elements (see `OC/timeline/components/timeline-ruler.tsx:50-98`, which computes `startTickIndex`/`endTickIndex` from scroll position).
- **`TimelineElement`** (`OC/timeline/components/timeline-element.tsx:222-…`, 1299 LOC). Renders a clip as `position: absolute` with `left: elementLeft` (`:382`) and `width: elementWidth` (`:383`). The clip reads its `renderElement` via `useElementPreview` (`:236-240`) so live drag/trim previews write into the same render path without committing. Selection expansion (keyframe lanes below the clip when expanded) is computed by `getExpandedRows` (`:309-313`).
- **Trim handles** are inside `<ElementInner>` (`:394`), rendered as `absolute left/right inset-y-0 w-3` divs that call `onResizeStart({side: "left" | "right"})` — these forward into the `ResizeController` via `use-timeline-resize.ts`.
- **Drag visual.** While dragging, `isBeingDragged` is computed from `dragView.memberTimeOffsets.get(element.id)` (`:257-260`); the element is given a `translate3d(0, dragOffsetY, 0)` transform (`:388-392`) so it floats with the cursor vertically (the horizontal motion is baked into `displayedStartTime` via `addMediaTime(currentTime, dragTimeOffset)` at `:267`).

### 14.3 OpenCut-classic `timeline/components/timeline-ruler.tsx` and `timeline-playhead.tsx`

- **`TimelineRuler`** (`OC/timeline/components/timeline-ruler.tsx:23-135`). **DOM-based, not canvas.** Tick interval is computed by `getRulerConfig({ zoomLevel, fps })` (`:43-46`). Visible window is computed from `useScrollPosition({ scrollRef: tracksScrollRef })` (`:50-52`) with a `bufferPx = Math.max(200, (scrollLeft + viewportWidth) * 0.15)` (`:56`), and only ticks in `[startTickIndex, endTickIndex]` are mounted (`:65-72`, `:74-98`). The ruler element is `role="slider"` with `aria-valuemin/max/now` (`:103-107`). Each tick is `<TimelineTick>` with a label gated by `shouldShowLabel({ time, labelIntervalSeconds })` (`:84-87`).
- **`TimelinePlayhead`** (`OC/timeline/components/timeline-playhead.tsx:35-135`). `position: absolute`, `pointer-events: none`, with a single 3px-wide line (`TIMELINE_INDICATOR_LINE_WIDTH_PX`) and a circular drag handle (`:127-132`). Keyboard navigation: ArrowLeft/ArrowRight nudges by one frame, computed from `fps.denominator / fps.numerator` and `TICKS_PER_SECOND` (`:85-90`), then seeks via `editor.playback.seek` (`:98-103`). The playhead subscribes to scroll via `useScrollPosition` (`:61`) and recomputes `leftPosition` from `timelineTimeToSnappedPixels(currentTime) - scrollLeft` (`:72-77`).

### 14.4 OpenCut-classic `timeline/controllers/` — controller pattern (VERIFIED REAL)

The controllers directory exists with **7 controller files**:

| Controller file | LOC | Class | Hook wrapper |
|---|---|---|---|
| `controllers/drag-drop-controller.ts` | 583 | `DragDropController` | `hooks/use-timeline-drag-drop.ts` (59 LOC) |
| `controllers/resize-controller.ts` | 363 | `ResizeController` | `hooks/use-timeline-resize.ts` (76 LOC) |
| `controllers/seek-controller.ts` | 210 | `SeekController` | `hooks/use-timeline-seek.ts` (65 LOC) |
| `controllers/playhead-controller.ts` | 318 | `PlayheadController` | `hooks/use-timeline-playhead.ts` (100 LOC) |
| `controllers/zoom-controller.ts` | 301 | `ZoomController` | `hooks/use-timeline-zoom.ts` (96 LOC) |
| `controllers/keyframe-drag-controller.ts` | 357 | `KeyframeDragController` | `hooks/element/use-keyframe-drag.ts` (69 LOC) |
| `controllers/element-interaction-controller.ts` | 731 | `ElementInteractionController` | `hooks/element/use-element-interaction.ts` (87 LOC) |

**Architectural pattern (verified):**

1. **Controller = a stateful class that owns interaction logic.** Each controller holds a `private session: Session` discriminated union (e.g., `ResizeController.session` at `controllers/resize-controller.ts:48`: `type Session = { kind: "idle" } | ResizeSession`). The state machine transitions are entirely inside the controller.
2. **Bound event handlers exposed as stable references.** The constructor binds every handler: `this.onResizeStart = this.onResizeStart.bind(this); this.handleMouseMove = this.handleMouseMove.bind(this); this.handleMouseUp = this.handleMouseUp.bind(this);` (`controllers/resize-controller.ts:169-171`). Same pattern in `DragDropController` (`:144-148`), `PlayheadController` (`:105-108`), `ElementInteractionController` (arrow functions at `:352`, `:402`, `:529`, `:680`).
3. **Document-level listeners attached on session start, removed on end.** `ResizeController.activate()` (`:245-248`) does `document.addEventListener("mousemove", ...); document.addEventListener("mouseup", ...)`; `deactivate()` (`:250-253`) removes them. This means React's synthetic event system is **not** on the critical drag path — performance is decoupled from React reconciliation.
4. **Subscribers + `useReducer` re-render trigger.** Each controller exposes `subscribe(fn)` and notifies on state change (`ResizeController.notify`, `:255-257`). The hook wrapper uses `useReducer((n) => n + 1, 0)` and subscribes (e.g., `hooks/use-timeline-resize.ts:62-63`):
   ```ts
   const [, rerender] = useReducer((n: number) => n + 1, 0);
   useEffect(() => controller.subscribe(rerender), [controller]);
   ```
5. **`configRef` pattern for stable controller + fresh deps.** Controllers are constructed once via `useState(() => new ResizeController({ configRef }))` (`hooks/use-timeline-resize.ts:60`). The config object (with all editor refs, callbacks, current selection) is rebuilt every render but stored in a `useCommittedRef` so the controller reads the latest values via `this.configRef.current` (`controllers/resize-controller.ts:174-176`). This avoids re-creating the controller (and re-binding listeners) on every render.
6. **Engine integration via injected callbacks.** The hook wrapper builds a `ResizeConfig` whose `commitElements` calls `editor.timeline.updateElements(...)` and whose `previewElements` calls `editor.timeline.previewElements(...)` (`hooks/use-timeline-resize.ts:41-57`). The controller never imports the engine directly — pure dependency injection.

**Benefit (verified):**
- **Testability.** `ResizeController` can be unit-tested by constructing a `configRef` with mock `previewElements`/`commitElements`/`getSceneTracks` and feeding synthetic mouse events. No React, no DOM needed beyond `document.addEventListener` (which can be stubbed).
- **Separation of concerns.** The 731-LOC `ElementInteractionController` (`controllers/element-interaction-controller.ts`) owns the entire drag state machine (`Session = idle | pending | dragging`, `:118-121`), drag-threshold detection (`movedPastDragThreshold`, `:157-168`), drop-target resolution (`resolveDropTarget`, `:196-247`), group-move resolution (`resolveGroupMoveForDrop`, `:249-287`), and the commit path (`handleMouseUp`, `:680-730`). The companion React component file (`timeline-element.tsx`, 1299 LOC) is purely rendering — it consumes `dragView` from the controller's `view` getter (`:310-331`) and never computes drag geometry itself.
- **Stable handler references.** Because handlers are bound in the constructor, the controller can be passed directly to React props without causing re-renders from new function identities.

### 14.5 OpenCut-classic `timeline/placement/` — placement algorithm (VERIFIED)

**Files (9 total):**

| File | LOC | Purpose |
|---|---|---|
| `placement/types.ts` | 40 | `PlacementStrategy` (5-variant union), `PlacementResult` (2-variant union), `PlacementTimeSpan`, `PlacementSubject` |
| `placement/compatibility.ts` | 51 | Element-type ↔ track-type compatibility table |
| `placement/overlap.ts` | 44 | Overlap detection predicate |
| `placement/insert-index.ts` | 88 | Default/highest/preferred new-track index calculation |
| `placement/main-track.ts` | 55 | Main-track zero-anchor enforcement |
| `placement/resolve.ts` | 278 | Strategy dispatcher (`resolveTrackPlacement`) |
| `placement/apply.ts` | 158 | Mutation: inserts elements into existing track or builds a new track |
| `placement/index.ts` | 12 | Re-exports |
| `placement/track-factory.ts` | 123 | `buildEmptyTrack({id, type})` factory for new tracks |

**Overlap detection (`placement/overlap.ts:8-27`):**

```ts
function wouldElementOverlap({ elements, startTime, endTime, excludeElementId }) {
  return elements.some((element) => {
    if (excludeElementId && element.id === excludeElementId) return false;
    const elementEnd = element.startTime + element.duration;
    return startTime < elementEnd && endTime > element.startTime;
  });
}
```

Standard half-open interval overlap. `canPlaceTimeSpansOnTrack` (`:29-44`) runs the predicate for every time span in the placement.

**Compatibility check (`placement/compatibility.ts:3-29`):**

A simple lookup table — `ELEMENT_TRACK_MAP` (`:3-11`): `audio→audio`, `text→text`, `sticker/graphic→graphic`, `effect→effect`, `video/image→video`. `canElementGoOnTrack` checks equality of mapped track type and requested track type (`:21-29`). No fuzzy compatibility — an `audio` element cannot go on a `video` track, period.

**Placement resolution (`placement/resolve.ts:134-278`):**

`resolveTrackPlacement` dispatches on `strategy.type` (`:147, :168, :190, :228, :273`). Five strategies (from `placement/types.ts:14-25`):

1. **`explicit`** (`:147-166`): caller specifies `trackId`. Verify track exists and type matches. Return `existingTrack` result (no overlap check — explicit overrides).
2. **`firstAvailable`** (`:168-188`): scan `orderedTracks` for first track of matching type where `canPlaceTimeSpansOnTrack` returns true (`findFirstAvailableTrackIndex`, `:69-87`). If none, fall back to `alwaysNew` with `position: "highest"`.
3. **`preferIndex`** (`:190-226`): try the preferred track index; if it's compatible AND has no overlap, use it. Otherwise, compute `resolvePreferredNewTrackPlacement` for an above/below insert position.
4. **`aboveSource`** (`:228-271`): try the track immediately above `sourceTrackIndex`; if not compatible or overlapping, fall back to `firstAvailable` then `alwaysNew`.
5. **`alwaysNew`** (`:273-277`): always create a new track. `position: "highest"` (top of stack) or `"default"` (bottom of section).

**Overlap resolution policy: REJECTED, NOT SHIFTED.** When `canPlaceTimeSpansOnTrack` returns false, the placement falls through to either a different existing track or a new track. The existing elements are never moved to make room. The only "shift" is `enforceMainTrackStart` (`placement/main-track.ts:27-55`): if you place on the main track at a time earlier than the earliest existing element, the start time is clamped to `ZERO_MEDIA_TIME` — but this is a special main-track invariant, not a general ripple.

**`apply.ts`** (`placement/apply.ts:17-76`): given a `PlacementResult`, either appends `elements` to the existing track's `elements` array (`:35-44`) or builds a fresh track via `buildPlacedAudioTrack`/`buildPlacedOverlayTrack` (`:114-158`) and splices it into `tracks.overlay` or `tracks.audio` at `insertIndex` (`:78-112`).

### 14.5A Magnetic main-track zero-anchor (Round-8 amendment — opencut-timeline, VERIFIED LOAD-BEARING)

> opencut-timeline's port of `placement/main-track.ts` (`enforceMainTrackStart`, `placement/index.ts:167-197`) surfaced semantics that §14.5 names but never spelled out. Three review rounds and the M5/M16 test fixtures encode them as load-bearing behavior; implementers without this section rediscover it painfully. **We adopt these as normative:**

1. **Empty main track → first element lands at exactly ZERO.** Not "at the requested startTime" — the main track's left edge is pinned to time 0 whenever it was empty.
2. **Requested start ≤ earliest existing element → clamped to ZERO.** Placing before the current earliest main-track element shifts the REQUEST, not the timeline — the main track never starts later than 0 and never has a leading gap.
3. **A sole main-track element cannot group-move away from time 0.** The group-move clamp applies (the drag feels "magnetic" at position 0); the raw `move` command is the programmatic escape hatch when a caller genuinely wants a leading gap.
4. **Insert startTime-override:** for multi-element inserts, the FIRST element lands at the requested start (subject to rules 1-2), later elements keep their relative offsets, and the batch may then be re-anchored as a whole. The element's own `startTime` field is IGNORED on the insert path — the command's placement parameters govern (this is the #2 hard-won gotcha in the reference repo's SKILL.md).

Test anchors: opencut-timeline M5 (placement) + M16 (boundary cases); spec 17 §13 carries the T1 fixtures. Main-track insert results must surface the ACTUAL landed start time in `CommandResult.data` when the anchor clamps (pairs with spec 15 §6.3's `MAIN_TRACK_CONSTRAINT` error code for the rejected variant).

### 14.6 OpenCut-classic `timeline/snapping/` — snap point computation (VERIFIED)

**Files (5 total, ~93 LOC of core logic):**

| File | LOC | Purpose |
|---|---|---|
| `snapping/types.ts` | 23 | `SnapPoint`, `SnapPointType` (5 variants), `SnapResult`, `TimelineSnapPointSource = () => Iterable<SnapPoint>` |
| `snapping/build.ts` | 17 | `buildTimelineSnapPoints({ sources })` — concatenates all source iterators into one array |
| `snapping/resolve.ts` | 29 | `resolveTimelineSnap({ targetTime, snapPoints, maxSnapDistance })` — linear scan for closest within threshold |
| `snapping/threshold.ts` | 15 | `getTimelineSnapThresholdInTicks({ zoomLevel })` — converts 10px threshold to ticks |
| `snapping/index.ts` | 9 | Re-exports |

**Algorithm:**

1. **Threshold is zoom-aware, in ticks.** `getTimelineSnapThresholdInTicks` (`snapping/threshold.ts:6-15`): `(snapThresholdPx / pixelsPerSecond) * TICKS_PER_SECOND`. Default `snapThresholdPx = 10`. So at 1x zoom, 10px ≈ 0.33s ≈ 8 frames at 24fps.
2. **Sources are lazy iterables.** `TimelineSnapPointSource = () => Iterable<SnapPoint>` (`snapping/types.ts:23`). `buildTimelineSnapPoints` (`build.ts:3-17`) just flattens them — no caching, no deduplication. Sources are recomputed on every snap query.
3. **Closest snap wins.** `resolveTimelineSnap` (`resolve.ts:4-29`): linear scan, `Math.abs(targetTime - snapPoint.time)` for distance. If `distance <= maxSnapDistance && distance < closestDistance`, update closest. Returns `{ snappedTime, snapPoint, snapDistance }`.
4. **Snap point types** (`snapping/types.ts:3-8`): `element-start`, `element-end`, `playhead`, `bookmark`, `keyframe`. Sources live elsewhere: `getElementEdgeSnapPoints` (`element-snap-source.ts`), `getPlayheadSnapPoints` (`playhead-snap-source.ts`), `getBookmarkSnapPoints` (`bookmarks/snap-source.ts`), `getAnimationKeyframeSnapPointsForTimeline` (`animation-snap-points.ts`).
5. **Usage in resize** (`controllers/resize-controller.ts:280-322`): builds sources excluding dragged element IDs, then for each member, computes `baseEdgeTime = startTime (left side) or startTime+duration (right side)`, calls `resolveTimelineSnap`, picks the closest across all members.

### 14.7 OpenCut-classic `timeline/types.ts` and project types

**File:** `OC/timeline/types.ts` (287 LOC, verified — no separate `project/types.ts`; all timeline types live here).

Key types:

- **`TScene`** (`:19-27`): `{ id, name, isMain, tracks: SceneTracks, bookmarks: Bookmark[], createdAt, updatedAt }`.
- **`SceneTracks`** (`:76-80`): the canonical track container — `{ overlay: OverlayTrack[], main: VideoTrack, audio: AudioTrack[] }`. The main track is **singular** (exactly one), overlays stack above it, audios stack below. This is the same shape OpenCut-classic uses everywhere (`components/index.tsx:130-136`, `placement/apply.ts:28`, `controllers/element-interaction-controller.ts:153`).
- **`TrackType`** (`:29`): `"video" | "text" | "audio" | "graphic" | "effect"`.
- **`TimelineTrack`** (`:67-72`): discriminated union of `VideoTrack | TextTrack | AudioTrack | GraphicTrack | EffectTrack`. Each has `id`, `name`, `type`, `elements: <constrained element-type>[]`. `VideoTrack.elements: (VideoElement | ImageElement)[]` (`:38`); `AudioTrack.elements: AudioElement[]` (`:51`); etc.
- **`BaseTimelineElement`** (`:105-115`): `{ id, name, duration: MediaTime, startTime: MediaTime, trimStart: MediaTime, trimEnd: MediaTime, sourceDuration?, animations?, params: ParamValues }`. `MediaTime` is `i64` ticks (from `@/wasm`).
- **`TimelineElement`** (`:166-173`): union of 7 element types — `AudioElement | VideoElement | ImageElement | TextElement | StickerElement | GraphicElement | EffectElement`. Each extends `BaseTimelineElement` and adds type-specific fields (e.g., `VideoElement.mediaId`, `VideoElement.retime?: RetimeConfig`, `VideoElement.effects?: Effect[]`, `VideoElement.masks?: Mask[]`).
- **`ElementDragView`** (`:242-257`): discriminated union `{ kind: "idle" } | { kind: "dragging", anchorElementId, trackId, memberTimeOffsets: ReadonlyMap<string, MediaTime>, ... dropTarget }`. Read-only view exposed by `ElementInteractionController.view`.
- **`DropTarget`** (`:259-265`): `{ trackIndex, isNewTrack, insertPosition: "above"|"below"|null, xPosition: MediaTime, targetElement: {elementId, trackId} | null }`.

### 14.8 OpenCut-classic `hooks/use-timeline-drag.ts`, `use-timeline-resize.ts` — hook pattern

**File names differ from seed spec.** The seed spec asked for `use-timeline-drag.ts` and `use-timeline-resize.ts`; the actual files are:
- `hooks/use-timeline-drag-drop.ts` (59 LOC) — wraps `DragDropController`. Used for **library drag-drop** (HTML5 DnD from media panel), returns `{ isDragOver, dropTarget, dragElementType, dragProps: {onDragEnter, onDragOver, onDragLeave, onDrop} }` (`:48-58`).
- `hooks/use-timeline-resize.ts` (76 LOC) — wraps `ResizeController`. Used for **element trim handles**. Returns `{ isResizing, handleResizeStart }` (`:72-75`).
- `hooks/element/use-element-interaction.ts` (87 LOC) — wraps `ElementInteractionController`. Used for **element body drag** (mouse drag to move). Returns `{ dragView, handleElementMouseDown, handleElementClick }` (`:82-86`).

**Pattern (uniform across all 7 hook wrappers):**

1. Build a `config` object from React state (zoom, refs, `editor.*`, callbacks).
2. Wrap in `useCommittedRef(config)` so the controller reads the latest values without re-creating.
3. `const [controller] = useState(() => new XController({ configRef }))` — instantiated once per component lifecycle.
4. `useReducer((n) => n + 1, 0)` for re-render trigger; `useEffect(() => controller.subscribe(rerender), [controller])`.
5. Cleanup: `useEffect(() => () => controller.destroy(), [controller])`.
6. **Cancellation hook:** `useTimelineResize` and `useElementInteraction` both register with `registerCanceller({ fn: () => controller.cancel() })` while the session is active (`use-timeline-resize.ts:65-68`, `use-element-interaction.ts:75-78`). This is what makes the Escape key abort a drag/trim.

### 14.9 FreeCut `timeline.tsx` and `timeline-content.tsx` — structural differences from OpenCut-classic

**File LOC:** `FC/components/timeline.tsx` (1101 LOC) + `FC/components/timeline-content.tsx` (2253 LOC) = 3354 LOC combined.

**Structural differences vs. OpenCut-classic:**

| Aspect | OpenCut-classic | FreeCut |
|---|---|---|
| Track model | `SceneTracks = { overlay[], main, audio[] }` — main is singular | Flat `tracks[]` array; tracks tagged `kind: 'video' \| 'audio'` (`utils/classic-tracks.ts`). A/V divider splits the track stack into two scroll-synced panes (`timeline.tsx:1031-1060`). |
| Ruler | DOM (`timeline-ruler.tsx`) | **Canvas** (`components/timeline-ruler-viewport-canvas.ts:32-113`, drawn by `timeline-ruler-surface.tsx`). Reason: FreeCut's ruler also draws timecode text, minor/major ticks, and adapts interval across 12 zoom bands (`getTimelineRulerInterval`, `:13-26`); DOM-per-tick was too slow at high zoom. |
| Track header column | Single column, scroll-synced vertically (`components/index.tsx:600-720`) | Same column, but with a **drag-resizable A/V section divider** persisted to localStorage (`timeline.tsx:338-436`). Middle-mouse-button anywhere in the timeline drags the divider (`timeline.tsx:438-450`). |
| Marquee | `useBoxSelect` from `@/selection` (`components/index.tsx:339-371`), `resolveTimelineElementIntersections` (`components/selection-hit-testing.ts`) | `useMarqueeSelection` from `@/shared/marquee` (`timeline-content.tsx:16`), `resolveTimelineMarqueeItems` (`utils/timeline-marquee-geometry.ts`). FreeCut also has a separate density-overview marquee preview (`utils/timeline-density-marquee-preview.ts`). |
| Drop zones | `DragLine` indicator only (`components/drag-line.tsx`) | Full ghost-preview system: `TimelineDropGhostPreviews` (`components/timeline-drop-ghost-previews.tsx`), `TrackDropPreviewStore`, `NewTrackZonePreviewStore`, `EffectDropPreviewStore` (8 preview stores in `stores/`). |
| Density mode | None | **Hybrid DOM + canvas.** `DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80` (`utils/timeline-dom-density.ts:6`). When a track has ≥80 items, cull buffer shrinks from 2000px → 600px (`:14-15`), compact clips (≤36px wide) render as a lightweight shell (`isTimelineItemCompactAtZoom`, `:45-53`), and a separate `TimelineDensityOverview` component (`components/timeline-density-overview.tsx`) takes over marquee. |
| Element drag | All elements translate via React state (`dragView.memberTimeOffsets`) | Same React-state path for small selections, but for **alt-drag with ≥24 items**, switches to a single shared canvas overlay (`use-timeline-drag.ts:41-119`, `LARGE_ALT_DRAG_CANVAS_THRESHOLD = 24`) — DOM is hidden, ghost items are painted to one full-viewport canvas for the duration of the drag. |

**Marquee implementation (FreeCut):** `useMarqueeSelection` (`@/shared/marquee/use-marquee-selection`) drives a `<MarqueeOverlay>` overlay (`timeline-content.tsx:48`). The geometry→items resolver is `resolveTimelineMarqueeItems` (`utils/timeline-marquee-geometry.ts`), which filters by track bounds + time overlap.

**Drop zones implementation (FreeCut):** Three preview stores cooperate:
- `track-drop-preview-store.ts` — ghost previews for clips dropped onto existing tracks (`useTrackDropPreviewStore`).
- `new-track-zone-preview-store.ts` — ghost previews for clips dropped into the empty zone above video / below audio tracks (`timeline.tsx:824-828`).
- `effect-drop-preview-store.ts` — per-item highlight when dropping an effect onto a clip.

### 14.10 FreeCut `components/timeline-item/` — component inventory

**65 files total** (verified via `ls | wc -l`). Breakdown: **38 production source files** (.tsx/.ts, excluding tests) + **18 test files** (.test.tsx/.test.ts) + **9 utility/state files** (pure helpers, predicates, constants). See §18 for the full table with one-line summaries per file.

The 6 deep-read files requested in the seed spec:

1. **`clip-content.tsx`** (996 LOC) — main clip renderer. Gates on `props.isCompactWidth` and returns null for compact clips (`:986-988`); dispatches to `WidthGatedMediaClipContent` for media, `DetailedClipContent` for non-media (`:989-995`). Width thresholds: `WAVEFORM_MIN_WIDTH_PX = 12`, `FILMSTRIP_MIN_WIDTH_PX = 20`, `MEDIA_LABEL_MIN_WIDTH_PX = 28` (`:34-37`).
2. **`trim-handles.tsx`** (267 LOC) — renders left/right trim edge handles. Edge color scheme is mode-aware: `TRIM_COLORS` (white), `RIPPLE_COLORS` (amber), `ROLL_COLORS` (amber, different glow), `FREE_COLORS` (green when actively trimming with headroom), `CONSTRAINED_COLORS` (red when hitting a bound) (`:18-35`, `:58-68`). Supports join-left / join-right hover indicators (`:51-52`).
3. **`stretch-handles.tsx`** (82 LOC) — rate-stretch handles. Only visible while `isStretching && stretchHandle === 'start' | 'end'` (`:27-39`); turns red when `stretchConstrained` (`:54-58`, `:74-76`). Hit area is 12px wide (`w-3`), visible indicator is 1px wide (`w-px`).
4. **`audio-fade-handles.tsx`** (191 LOC) — fade in/out handles + curve dots. Each handle is a 10×10px button with a 9px invisible hit padding (`:79`, `before:-inset-[9px]`). Includes a `FloatingReadout` showing the fade duration label while hovering (`:180-188`).
5. **`tool-operation-overlay.tsx`** (61 LOC) — overlay box during trim/ripple/roll/slip/slide/stretch. Position-only — the geometry math lives in `tool-operation-overlay-utils.ts` (553 LOC).
6. **`drag-ghosts.tsx`** (34 LOC) — single `FollowerDragGhost` component, used for alt-drag follower previews. Renders as a dashed-border box with a "+" badge in the corner (`:19-32`); `display: none` initially, shown via direct DOM manipulation in the drag hook.

### 14.11 FreeCut `hooks/` — hook pattern

**File LOC:** `use-timeline-drag.ts` (1553), `use-timeline-trim.ts` (950), `use-rate-stretch.ts` (772), `use-timeline-slip-slide.ts` (1291) = **4566 LOC total**.

**Pattern: completely different from OpenCut-classic.** Where OpenCut-classic uses a 7-controller DI architecture, FreeCut uses **one monolithic hook per operation**, with internal state machines + a `createRafCoalescedCallback` for throttling DOM writes. Each hook returns `{ is<Op>Active, <op>Handle, <op>Delta, isConstrained, handle<Op>Start }`.

| Hook | State machine | Snap | Linked items | Commit path |
|---|---|---|---|---|
| `use-timeline-drag.ts` | `DragState` (5 variants) | `useSnapCalculator` | `expandSelectionWithLinkedItems`, `buildLinkedMovePreviewUpdates` | `useTimelineStore.getState().moveItems` |
| `use-timeline-trim.ts` | `TrimState` (12 fields, `:53-68`) | `useSnapCalculator` | `getSynchronizedLinkedItems`, `buildSynchronizedLinkedMoveUpdates` | `trimItemStart`/`trimItemEnd`/`rippleTrimItem`/`rollingTrimItems`/`trimItemBreakingTransition` (5 commit variants based on mode) |
| `use-rate-stretch.ts` | Speed delta math (`calculateSpeed`, `clampSpeed` in `utils/source-calculations.ts`) | `useSnapCalculator` | `getSynchronizedLinkedItems` | `rateStretchItem` action |
| `use-timeline-slip-slide.ts` | `SlipSlideState` (10 fields, `:50-60`) | `useSnapCalculator` | `getMatchingSynchronizedLinkedCounterpart` | `slipItem`/`slideItem` actions |

**What each hook does:**
- **`use-timeline-drag`** — mousedown → pending; mousemove past `DRAG_THRESHOLD_PIXELS` → dragging; computes snap target via `useSnapCalculator`; writes preview via `applyMovePreview` to `linked-edit-preview-store`; on mouseup, commits via `moveItems` action. Has a large-alt-drag canvas fast path (`:41-119`).
- **`use-timeline-trim`** — detects edge (start/end) from pointer position; computes delta in frames via `pixelsToTimeNow`; clamps via `clampTrimAmount` + `clampToAdjacentItems` + transition-aware guards (`clampRippleTrimDeltaToPreserveEditState`, `clampRollingTrimDeltaToPreserveEditState`); writes preview per-frame via `createRafCoalescedCallback`; commits via one of 5 actions based on `isRollingEdit`/`isRippleEdit`/`destroyTransitionAtHandle` flags.
- **`use-rate-stretch`** — converts pixel delta to speed delta (`-(deltaFrames / 30) * 0.1`); clamps to `[MIN_SPEED, MAX_SPEED]`; for ripple-stretch, computes preview shifts for downstream neighbors (`computeRipplePreviewUpdates`, `:51-79`).
- **`use-timeline-slip-slide`** — detects slip vs slide from initial pointer position relative to clip body; clamps with `computeClampedSlipDelta` (slip) or `clampSlideDeltaToPreserveTransitions` + `clampSlideDeltaToPreserveKeyframes` (slide); commits via `slipItem`/`slideItem` actions.

### 14.12 FreeCut `utils/timeline-snap-utils.ts` and `razor-snap.ts`

**`utils/timeline-snap-utils.ts`** (184 LOC):

- **`getFilteredItemSnapEdges`** (`:29-87`) — builds `ItemSnapEdge[]` from items, transitions, and visible-track filter. Suppresses transition-internal edges (left clip's end + right clip's start) so a transition appears as one continuous snap target (`:46-51`). Adds transition visual midpoints as snap targets (`:53-71`). Excludes the dragged item (`:74-84`).
- **`generateGridSnapPoints`** (`:98-124`) — zoom-tiered grid: 1s at >2x, 5s at 0.5–2x, 10s below.
- **`findNearestSnapTarget`** (`:134-155`) — linear scan, `Math.abs(targetFrame - target.frame)`; returns first within `thresholdFrames`.
- **`calculateAdaptiveSnapThreshold`** (`:168-184`) — `thresholdPixels = baseThresholdPixels / sqrt(zoomLevel)`; converts to frames. Inversely proportional to sqrt(zoom) — at 4x zoom, threshold halves (tighter snap); at 0.25x zoom, threshold doubles (looser snap).

**`utils/razor-snap.ts`** (90 LOC):

- **`getRazorSplitPosition`** (`:36-90`) — two-mode razor snap:
  1. **Default** (`:69-89`): snaps only to playhead within `RAZOR_PLAYHEAD_SNAP_THRESHOLD_PX = 10px` (`:6`). Suppressed while playing (`!isPlaying`).
  2. **Shift-held** (`:46-67`): snaps to nearest of `snapTargets[]` (item-start, item-end, grid, playhead, marker) within `RAZOR_SNAP_THRESHOLD_PX = 12px` (`:7`).
- Returns `{ splitFrame, snappedX, snappedToPlayhead, snappedTarget? }`. Used by both the split-indicator visual and the actual split execution, ensuring visual target === executed target (`:1-4` comment).

### 14.13 FreeCut `components/timeline-ruler-viewport-canvas.tsx` — why canvas for ruler?

**File:** `FC/components/timeline-ruler-viewport-canvas.ts` (113 LOC, `.ts` not `.tsx` — it's a pure drawing function, no JSX).

The function `drawTimelineRulerViewportCanvas({ canvas, scrollLeft, viewportWidth, canvasHeight, pixelsPerSecond, fps })` (`:32-113`) does:

1. **DPR-aware backing store sizing** (`:51-59`): clamps `devicePixelRatio` to ≤2 to avoid retina memory bloat; resizes the canvas only when backing dimensions change.
2. **12-band interval table** (`getTimelineRulerInterval`, `:13-26`): pixel-density-driven intervals, e.g., `pixelsPerSecond >= 180 → intervalInSeconds: 15/30` (half-frame ticks); `pixelsPerSecond >= 1 → 120s`; `pixelsPerSecond < 0.2 → 1800s` (30-minute ticks).
3. **Tick culling** (`:68-86`): only draws ticks in `[firstIndex, lastIndex]` derived from `scrollLeft` and `viewportWidth`.
4. **Minor tick suppression** (`:71-75`): minor ticks are only drawn if `visibleMarkerCount < MAX_VISIBLE_MINOR_MARKERS (72)` AND `minorSpacing >= MIN_MINOR_TICK_SPACING_PX (14)`. This prevents sub-pixel ticks at high zoom-out.
5. **Text labels** (`:103-112`): drawn via `context.fillText` with `formatTimecode(secondsToFrames(timeInSeconds, fps), fps)`.

**Why canvas?** Three reasons visible from the code:

1. **Density.** At extreme zoom-out (`pixelsPerSecond < 0.2`), a single screen can show 1800+ ticks. DOM elements at that count cause layout thrash; canvas draws them in one `stroke()` call (`:79-86`).
2. **Text.** Timecode text rendering in DOM requires measuring, layout, font subpixel positioning. Canvas `fillText` is one call per label and lets the browser composite directly.
3. **DPR.** The canvas rescales the backing store once (`setTransform(dpr, 0, 0, dpr, 0, 0)`, `:61`); DOM would require per-tick font-size adjustments for retina.

**Recommendation for our spec:** We keep OpenCut-classic's DOM ruler as the default (matches user's "intuitive" preference and supports ARIA natively). We adopt FreeCut's `getTimelineRulerInterval` 12-band table as a fallback when zoom-out crosses a threshold (e.g., `pixelsPerSecond < 4`). The crossover point: **when visible tick count exceeds ~200, switch to canvas**. See §17 correction.

### 14.14 OpenCut-classic `apps/web/src/components/editor/panels/` — panel layout

**File:** `OC/app/editor/[project_id]/page.tsx` (209 LOC). Uses `ResizablePanelGroup` from `@/components/ui/resizable` (shadcn/ui wrapper over `react-resizable-panels`).

**Layout structure (`EditorLayout()`, `:81-209`):**

```
<ResizablePanelGroup direction="vertical">           // outer: rows
  <ResizablePanel defaultSize={panels.mainContent}>    // top row
    <ResizablePanelGroup direction="horizontal">       // inner: columns
      <ResizablePanel> <AssetsPanel/> </ResizablePanel>          // tools (15-40%)
      <ResizableHandle withHandle />
      <ResizablePanel> <PreviewPanel/> </ResizablePanel>          // preview (30-100%)
      <ResizableHandle withHandle />
      <ResizablePanel> <PropertiesPanel/> </ResizablePanel>      // properties (15-40%)
    </ResizablePanelGroup>
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={panels.timeline}>       // bottom row: timeline (15-70%)
    <Timeline/>
  </ResizablePanel>
</ResizablePanelGroup>
```

**Constraints:** Top row `minSize={30} maxSize={85}`; timeline `minSize={15} maxSize={70}`. Horizontal: tools `minSize={15} maxSize={40}`, preview `minSize={30}`, properties `minSize={15} maxSize={40}`. Sizes are persisted via `usePanelStore` and committed in `onLayout` callbacks (`:132-141`, `:152-158`).

**Editor header** (`EditorHeader`, `:47`) sits above the panel group, full-width. Migration dialog, onboarding, and changelog notification are overlays. `DegradedRendererBanner` (`:60-79`) is a dismissible top banner shown when the renderer falls back (e.g., non-Chrome browser).

---

## 15. Test Plan for This Stream

1. **Render test:** Load a project with 100 clips on 5 tracks. Assert: <100ms render time, <500 DOM nodes (virtualization working).

2. **Interaction test:** Programmatically drag a clip from position A to position B. Assert: clip's `startTime` updates correctly, undo reverts it, redo re-applies it.

3. **Trim test:** Programmatically trim a clip's right edge by 10 frames. Assert: duration decreases by 10 frames, no overlap with adjacent clip.

4. **Snap test:** Drag a clip to within snap threshold of another clip's edge. Assert: snaps to the edge.

5. **Razor test:** Click razor tool, click in middle of a clip. Assert: clip splits into two at the click position.

6. **Marquee test:** Drag a marquee over 3 clips. Assert: all 3 selected.

7. **Keyboard test:** Press each shortcut, assert correct command fires.

8. **Virtualization test:** Scroll timeline. Assert: only visible clips are in the DOM (verify via DevTools node count).

9. **Filmstrip test:** Load a 60-second video clip. Assert: filmstrip shows ~10 thumbnails (depending on width), each thumbnail is a real frame from the source.

10. **Waveform test:** Load an audio clip. Assert: waveform renders with correct peaks (compare to reference waveform extraction).

---

## 16. Code References

Every file path below is absolute within its reference repo. **OC** = `/tmp/opencut-classic/apps/web/src/timeline/`; **OC-App** = `/tmp/opencut-classic/apps/web/src/app/editor/[project_id]/`; **OC-Actions** = `/tmp/opencut-classic/apps/web/src/actions/`; **FC** = `/tmp/freecut/src/features/timeline/`. **OT** = opencut-timeline (`github.com/bearachprema/opencut-timeline` @ `d3b2163`, root `src/lib/timeline/`) — the live clean-room OpenCut-classic timeline port, landed Round 8; it is the executable counterpart of OC's algorithmic core (types/placement/ripple/snapping/controllers/view-math) plus a spec-15-shaped headless API, but has **no React components yet** (W4 pending). Note: nle-engine has **no React timeline** (player harness only — see §16.4); it contributes the data model (timeline.ts) but zero UI code for this stream.

### 16.1 OpenCut-classic — timeline

| File | LOC | Key exports / line numbers |
|---|---|---|
| `OC/components/index.tsx` | 954 | `Timeline()` `:117`; `TrackLabelsPanel` `:600`; `TimelineTrackRows` `:723`; `TimelineGutter` `:889`; wheel listener `:234-294`; `syncFollowers` `:221-230` |
| `OC/components/timeline-track.tsx` | 114 | `TimelineTrackContent` `:36`; renders `<TimelineElement>` per element `:83-110` |
| `OC/components/timeline-element.tsx` | 1299 | `TimelineElement` `:222`; `getKeyframeIndicators` `:141-186`; expanded keyframe lanes `:354-373`; drag transform `:388-392` |
| `OC/components/timeline-ruler.tsx` | 135 | `TimelineRuler` `:23`; tick culling `:65-72`; `role="slider"` `:102-107`; buffer `:56` |
| `OC/components/timeline-playhead.tsx` | 135 | `TimelinePlayhead` `:35`; keyboard frame-step `:79-104`; `pointer-events: none` `:115` |
| `OC/components/timeline-toolbar.tsx` | 377 | `TimelineToolbar` `:53`; split/split-left/split-right buttons `:145-163`; snapping + ripple toggles `:286-298`; zoom slider `:311-320` |
| `OC/components/snap-indicator.tsx` | 51 | `SnapIndicator` `:18`; only renders when `isVisible && snapPoint` `:32-34` |
| `OC/components/drag-line.tsx` | 30 | `DragLine` `:12`; drop-target Y from `getDropLineY` `:20` |
| `OC/components/audio-waveform.tsx` | 352 | `AudioWaveform` `:59`; visible-window clip `:114-142`; render signature cache `:157-181`; scroll-parent listener `:317-334` |
| `OC/components/layout.ts` | 21 | `TIMELINE_TRACK_HEIGHTS_PX` `:3-9` (video=65, audio=50, text/graphic/effect=25); `TIMELINE_RULER_HEIGHT_PX = 22` `:17`; `TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX = 112` `:16` |
| `OC/components/interaction.ts` | 4 | `TIMELINE_DRAG_THRESHOLD_PX = 5`; `TIMELINE_HORIZONTAL_WHEEL_STEP_PX = 40`; `TIMELINE_ZOOM_BUTTON_FACTOR = 1.7`; `TIMELINE_ZOOM_ANCHOR_PLAYHEAD_THRESHOLD = 0.15` |
| `OC/components/selection-hit-testing.ts` | — | `resolveTimelineElementIntersections` for marquee |
| `OC/components/drop-target.ts` | — | `computeDropTarget`, `getDropLineY` |
| `OC/controllers/drag-drop-controller.ts` | 583 | `DragDropController` class `:136`; HTML5 DnD handlers `:177-275`; `executeMediaDrop` `:428-455`; file-drop path `:493-582` |
| `OC/controllers/resize-controller.ts` | 363 | `ResizeController` class `:162`; `buildResizeMembers` `:72-140`; snap logic `snappedDelta` `:266-323`; commit `:348-362` |
| `OC/controllers/seek-controller.ts` | 210 | `SeekController` class `:80`; click-vs-drag detection `isClickGesture` `:66-78`; `seekFromEvent` `:173-209` |
| `OC/controllers/playhead-controller.ts` | 318 | `PlayheadController` class `:97`; `onPlayheadMouseDown` `:129-141`; `onRulerMouseDown` `:143-158`; `handlePlaybackUpdate` (auto-scroll) `:183-213`; `updatePlayheadLeft` (imperative DOM) `:167-177` |
| `OC/controllers/zoom-controller.ts` | 301 | `ZoomController` class `:38`; `applyZoomLayout` (playhead-anchored above 15% slider) `:145-215`; `bindPreventBrowserZoom` `:276-294` |
| `OC/controllers/keyframe-drag-controller.ts` | 357 | `KeyframeDragController` class `:84`; pending→active state machine `:25-38`; `RetimeKeyframeCommand` commit `:17` |
| `OC/controllers/element-interaction-controller.ts` | 731 | `ElementInteractionController` class `:291`; `Session = idle\|pending\|dragging` `:118-121`; `view` getter `:310-331`; `beginDragFromPending` `:554-634`; `handleMouseUp` commit `:680-730` |
| `OC/placement/resolve.ts` | 278 | `resolveTrackPlacement` `:134`; 5 strategy branches `:147, :168, :190, :228, :273` |
| `OC/placement/overlap.ts` | 44 | `wouldElementOverlap` `:8-27`; `canPlaceTimeSpansOnTrack` `:29-44` |
| `OC/placement/compatibility.ts` | 51 | `ELEMENT_TRACK_MAP` `:3-11`; `canElementGoOnTrack` `:21-29`; `validateElementTrackCompatibility` `:31-51` |
| `OC/placement/insert-index.ts` | 88 | `getDefaultInsertIndexForTrack` `:3-19`; `getHighestInsertIndexForTrack` `:21-33`; `resolvePreferredNewTrackPlacement` `:35-88` |
| `OC/placement/main-track.ts` | 55 | `enforceMainTrackStart` `:27-55`; clamps to ZERO_MEDIA_TIME if before earliest element |
| `OC/placement/apply.ts` | 158 | `applyPlacement` `:17-76`; new-track splice `:78-112`; `buildPlacedAudioTrack`/`buildPlacedOverlayTrack` `:114-158` |
| `OC/placement/track-factory.ts` | 123 | `buildEmptyTrack({id, type})` |
| `OC/placement/types.ts` | 40 | `PlacementStrategy` (5 variants) `:14-25`; `PlacementResult` (2 variants) `:27-40` |
| `OC/placement/index.ts` | 12 | Re-exports |
| `OC/snapping/build.ts` | 17 | `buildTimelineSnapPoints` `:3-17` — flattens source iterables |
| `OC/snapping/resolve.ts` | 29 | `resolveTimelineSnap` `:4-29` — linear scan, closest within threshold |
| `OC/snapping/threshold.ts` | 15 | `getTimelineSnapThresholdInTicks` `:6-15` — 10px / pps × TICKS_PER_SECOND |
| `OC/snapping/types.ts` | 23 | `SnapPoint`, `SnapPointType` (5 variants) `:3-8`; `TimelineSnapPointSource = () => Iterable<SnapPoint>` `:23` |
| `OC/snapping/index.ts` | 9 | Re-exports |
| `OC/types.ts` | 287 | `TScene` `:19-27`; `SceneTracks` `:76-80`; `TimelineElement` union `:166-173`; `ElementDragView` `:242-257`; `DropTarget` `:259-265` |
| `OC/hooks/use-timeline-drag-drop.ts` | 59 | wraps `DragDropController`; returns `{isDragOver, dropTarget, dragElementType, dragProps}` `:48-58` |
| `OC/hooks/use-timeline-resize.ts` | 76 | wraps `ResizeController`; `registerCanceller` on Escape `:65-68` |
| `OC/hooks/use-timeline-seek.ts` | 65 | wraps `SeekController`; 4 handler props `:59-64` |
| `OC/hooks/use-timeline-playhead.ts` | 100 | wraps `PlayheadController`; scroll listener `:62-69`; playback event subscription `:72-81` |
| `OC/hooks/use-timeline-zoom.ts` | 96 | wraps `ZoomController`; `useLayoutEffect` for layout reconciliation `:74-76` |
| `OC/hooks/use-edge-auto-scroll.ts` | 97 | Auto-scrolls when pointer within N pixels of viewport edge during drag |
| `OC/hooks/use-scroll-sync.ts` | 173 | Syncs scroll across multiple containers |
| `OC/hooks/use-scroll-position.ts` | 52 | Reactive `scrollLeft`/`viewportWidth` from a scroll ref |
| `OC/hooks/use-initial-scroll-bottom.ts` | 42 | Initial scroll-to-bottom on mount |
| `OC/hooks/use-snap-indicator-position.ts` | 41 | Pixel position of the snap indicator line |
| `OC/hooks/element/use-element-interaction.ts` | 87 | wraps `ElementInteractionController`; returns `{dragView, handleElementMouseDown, handleElementClick}` `:82-86` |
| `OC/hooks/element/use-element-selection.ts` | 137 | Selection store wrapper |
| `OC/hooks/element/use-keyframe-drag.ts` | 69 | wraps `KeyframeDragController` |
| `OC/hooks/element/use-keyframe-selection.ts` | 229 | Keyframe selection + range select |
| `OC/hooks/element/use-keyframe-box-select.ts` | 217 | Marquee selection within expanded keyframe lanes |
| `OC/group-move/index.ts` | 12 | Re-exports `buildMoveGroup`, `resolveGroupMove`, `snapGroupEdges` |
| `OC/group-resize/index.ts` | — | Re-exports `computeGroupResize` |

### 16.2 OpenCut-classic — editor layout & actions

| File | LOC | Key exports / line numbers |
|---|---|---|
| `OC-App/page.tsx` | 209 | `EditorLayout()` `:81-209`; nested `ResizablePanelGroup` (vertical → horizontal) `:129-207`; `usePanelStore` for size persistence `:83, :132-141` |
| `OC-Actions/definitions.ts` | 211 | `ACTIONS` map `:24-151`; `ACTION_DEFAULT_SHORTCUTS` `:155-179`; `getDefaultShortcuts()` `:197-210` |
| `OC-Actions/keybinding.ts` | 44 | `ModifierKeys` `:7-14`; `Key` union `:16-25`; `ShortcutKey = ModifierBasedShortcutKey \| SingleCharacterShortcutKey` `:39` |

### 16.3 FreeCut — timeline

| File | LOC | Key exports / line numbers |
|---|---|---|
| `FC/components/timeline.tsx` | 1101 | `Timeline` (memo) `:85`; A/V divider drag `:338-436`; MMB hijack `:438-450`; RAF drop-indicator loop `:531-548`; RAF drag visual loop `:554-621`; ESC exits composition `:626-654`; track-header section renderer `:800-905` |
| `FC/components/timeline-content.tsx` | 2253 | (read summary §14.9) |
| `FC/components/timeline-ruler-viewport-canvas.ts` | 113 | `drawTimelineRulerViewportCanvas` `:32-113`; `getTimelineRulerInterval` 12-band table `:13-26` |
| `FC/components/timeline-track.tsx` | (large) | Per-track item renderer; consumes `useVisibleItems`; handles collision-aware drop |
| `FC/components/timeline-item/index.tsx` | 1304 | `TimelineItem` (memo) `:113`; composes 7 hooks (`useTimelineDrag`, `useTimelineTrim`, `useRateStretch`, `useTimelineSlipSlide`, `useTrackPush`, `useCaptionDialogState`, `useAutoTranscriptCaptions`) `:280-312` |
| `FC/components/timeline-item/clip-content.tsx` | 996 | `ClipContent` (memo) `:980`; width-gated dispatch `:986-996`; thresholds `:34-37` |
| `FC/components/timeline-item/trim-handles.tsx` | 267 | `TrimHandles` `:76`; 4 color schemes `:18-35`; `resolveEdgeColors` `:58-68` |
| `FC/components/timeline-item/stretch-handles.tsx` | 82 | `StretchHandles` `:18`; conditional visibility `:27-39` |
| `FC/components/timeline-item/audio-fade-handles.tsx` | 191 | `AudioFadeHandles` `:26`; curve-dot editing `:147-178` |
| `FC/components/timeline-item/tool-operation-overlay.tsx` | 61 | `ToolOperationOverlay` `:10`; mode-specific box styles `:15-43` |
| `FC/components/timeline-item/drag-ghosts.tsx` | 34 | `FollowerDragGhost` `:13` |
| `FC/components/clip-filmstrip/index.tsx` | 334 | `ClipFilmstrip` `:63`; tile-window compute `:100`; viewport pad `VIEWPORT_PAD_TILES = 2, VIEWPORT_PAD_PX = 600` `:19-20` |
| `FC/components/clip-filmstrip/tiled-canvas.tsx` | 161 | `TiledCanvas` `:39`; `TILE_WIDTH = 1000` `:4`; canvas pool `:50-57`; tile virtualization `:60-73` |
| `FC/components/clip-filmstrip/visible-filmstrip-canvas.tsx` | — | Per-tile filmstrip renderer |
| `FC/components/clip-filmstrip/filmstrip-canvas-geometry.ts` | — | Tile→frame math |
| `FC/components/clip-filmstrip/filmstrip-image-cache.ts` | — | LRU image cache for filmstrip frames |
| `FC/components/clip-filmstrip/render-window.ts` | — | Visible-window math |
| `FC/components/clip-filmstrip/filmstrip-skeleton.tsx` | — | Loading placeholder |
| `FC/components/clip-filmstrip/image-filmstrip.tsx` | — | Image-only (no decode) filmstrip path |
| `FC/components/clip-waveform/index.tsx` | 419 | `ClipWaveform` `:65`; amplitude compute `:95-97`; codec detection `:99-100` |
| `FC/components/clip-waveform/visible-waveform-canvas.tsx` | — | Per-window waveform renderer |
| `FC/components/clip-waveform/amplitude.ts` | — | Peak→pixel height |
| `FC/components/clip-waveform/render-window.ts` | — | Visible-window math |
| `FC/components/clip-waveform/adaptive-render-version.ts` | — | Render cache invalidation key |
| `FC/hooks/use-timeline-drag.ts` | 1553 | (see §14.11) |
| `FC/hooks/use-timeline-trim.ts` | 950 | `TrimState` `:53-68`; RAF preview `:51`; 5 commit paths `:25-31` |
| `FC/hooks/use-rate-stretch.ts` | 772 | `isRateStretchableItem` `:34-37`; ripple preview `:51-79` |
| `FC/hooks/use-timeline-slip-slide.ts` | 1291 | `SlipSlideState` `:50-60`; transition-aware clamping `:36-38` |
| `FC/hooks/use-snap-calculator.ts` | 187 | `useSnapCalculator` `:36`; threshold `getSnapThresholdFrames` `:45-53`; magnetic targets `:63-84`; `calculateSnap` `:107-120` |
| `FC/hooks/use-clip-visibility.ts` | 146 | `useClipVisibility` `:37`; 600px prefetch margin `:12`; `useSyncExternalStore` for zoom `:50-54` |
| `FC/hooks/use-visible-items.ts` | 873 | (read §14.9 — virtualization driver) |
| `FC/utils/timeline-snap-utils.ts` | 184 | `getFilteredItemSnapEdges` `:29-87`; `generateGridSnapPoints` `:98-124`; `findNearestSnapTarget` `:134-155`; `calculateAdaptiveSnapThreshold` `:168-184` |
| `FC/utils/razor-snap.ts` | 90 | `getRazorSplitPosition` `:36-90`; `RAZOR_PLAYHEAD_SNAP_THRESHOLD_PX = 10` `:6`; `RAZOR_SNAP_THRESHOLD_PX = 12` `:7` |
| `FC/utils/timeline-dom-density.ts` | 115 | `DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80` `:6`; `DEFAULT_TIMELINE_ITEM_CULL_BUFFER_PX = 2000` `:14`; `DENSE_TIMELINE_ITEM_CULL_BUFFER_PX = 600` `:15`; `COMPACT_TIMELINE_ITEM_MAX_WIDTH_PX = 36` `:16`; `getTimelineItemCullBufferPx` `:39-43`; `isTimelineItemCompactAtZoom` `:45-53` |
| `FC/hooks/use-timeline-shortcuts.ts` | 43 | Composes 8 sub-hooks `:34-43` |
| `FC/hooks/shortcuts/*.ts` | (8 files) | (see §19) |
| `FC/components/timeline-ruler-surface.tsx` | — | DOM wrapper that owns the canvas, scroll, and pointer |

### 16.4. Code References — nle-engine (reference, NOT canon)

> nle-engine (github.com/bearachprema/nle-engine) has **no React timeline** — no components, no controllers, no virtualization; the timeline UI is entirely greenfield (opencut-timeline §16.5 is the timeline-side code reference — algorithms + controllers, components pending W4; see spec 19 §3.2). The engine contributes the data model and ordering contracts below. Where engine code conflicts with this spec, **the spec wins**.

| Spec section | Engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| Whole spec (timeline UI) | (repo census) | only `src/components/ui/*` + test harness page | ENGINE-GAP | No React timeline; spec is greenfield |
| §12.1 track ordering | `src/lib/nle/playback/scene-assembly.ts:210` | `The \`zIndex = (maxOrder - trackOrder) * 1000\` formula` | ALIGNED | Stable z-index from track order |
| §7.3 clip DOM state | `src/lib/nle/playback/scene-assembly.ts:158` | `export interface StableDomItemDescriptor {` | ALIGNED | Minimal per-item state for virtualized DOM |
| §7.3 CSS transforms | `src/lib/nle/playback/transform-resolver.ts:462` | `export function buildCssTransform(` | ALIGNED | React-agnostic CSS transform builder |
| §12.3 linked selection | `src/lib/nle/timeline/timeline.ts:2224` | `getLinkedClips(clipId: string): Clip[] {` | ALIGNED | Linked A/V query |
| §11.1 markers | `src/lib/nle/timeline/timeline.ts:5546` | `addMarker(` | ALIGNED | Marker CRUD model |
| §11.2 in/out points | `src/lib/nle/timeline/timeline.ts:5642` | `setInPoint(frame: number): void {` | ALIGNED | In/out model present |
| §8.3/§8.4 drag coalescing | — | COULD-NOT-VERIFY (no previewElements/commitPreview) | ENGINE-GAP | spec 06 §4.6 pattern has no counterpart |
| §6 virtualization / §5 zoom | — | COULD-NOT-VERIFY | SPEC-ONLY | Engine is frame-based; time↔px lives at UI boundary |
| op entry surface | `src/lib/nle/headless/api.ts:804` | `case 'split': {` | CORRECTIVE | 19-op JSON-RPC vs spec 15 dispatcher; spec wins |

### 16.5. Code References — opencut-timeline (the editing-domain core per Decision 12; contract still canon)

> opencut-timeline (`github.com/bearachprema/opencut-timeline` @ `4e39b67`, ~24.5k LOC total: ~8.7k engine core + 3.0k controllers + 3.8k React components + 9.0k testing, **297/297 tests — "FINAL as a distilled opencut timeline"** per its own HANDOFF, real-mouse + fuzz + review-regression suites included) is a clean-room OpenCut-classic timeline port **built with this spec set in hand** (its README cites Decision-2 types and the spec-15 wire protocol). Per Decision 12 it is the **EDITING-domain normative core**: the executable reference for this stream's entire scope — the OC tables in §16.1 describe the ORIGINAL; OT is the running, tested version of the same algorithms, and its W4 React components + controllers have LANDED (this spec's §4 component hierarchy and §14.4 controller contracts now have an executable implementation). Where OT code conflicts with this spec, **the spec wins** (the known deltas: prefixed headless command names (C7), 5-kind TrackType taxonomy, `TIMELINE_INDICATOR_LINE_WIDTH_PX = 2` vs OC's 3px — OC's verified read wins for the visual constant, pending an OT-side correction).

| Spec section | OT file:line | Key exports / behavior | Status | Note |
|---|---|---|---|---|
| Data model / Decision 2 (spec 06 §4.7) | `types/index.ts:95-99` | `SceneTracks {overlay[], main singleton, audio[]}`; 5 track kinds `:43`; 7-way `TimelineElement` union `:155-162` | ALIGNED | The spec-06 §4.7 shape, executable; 5-kind taxonomy maps to our 3 at the wire boundary (Decision 11.5, carried by Decision 12) |
| §5.2 zoom | `view/scale.ts:6-8` | `BASE_TIMELINE_PIXELS_PER_SECOND = 50`; `TIMELINE_ZOOM_MIN = 0.1` (dynamic via `view/zoom-utils.ts:20-35`); `TIMELINE_ZOOM_MAX = 100` | ALIGNED | Reference for the Round-8 §5.2 rewording |
| §5.3 px math | `view/pixel-utils.ts:43/:53/:63` | `timelineTimeToPixels`/`timelinePixelsToTime`/`snapPixelToDeviceGrid` (DPR) | ALIGNED | Frame-round-trip invariant tested in M10 |
| §5.2 zoom slider | `view/zoom-utils.ts:72/:88` | `sliderToZoom`/`zoomToSlider` exponential mapping | ALIGNED | |
| Ruler (§14.3 cross-ref) | `view/ruler-utils.ts:21-43` | `LABEL_FRAME_INTERVALS = [2,3,5,10,15]`, `TICK_FRAME_INTERVALS = [1,2,3,5,10,15]`, `MIN_LABEL_SPACING_PX = 120`, `MIN_TICK_SPACING_PX = 18`, `getRulerConfig` | ALIGNED | OpenCut's interval-selection tables — reference for our ruler; values not yet verified against OC source, treat as OT-normalized |
| Layout constants | `view/layout.ts:10/:18/:22-24` | `TIMELINE_TRACK_HEIGHTS_PX`; `KEYFRAME_LANE_HEIGHT_PX = 20`; ruler 22px; labels column 112px | ALIGNED | Matches OC `components/layout.ts` (§16.1) |
| §8.3 drag threshold | `controllers/element-interaction-controller.ts:51/:169` | `TIMELINE_DRAG_THRESHOLD_PX = 5`, strict `>` | ALIGNED | M16 boundary test at exactly 5px |
| §8.3 coordinate space | `controllers/*` (config injection) | `elementRectLeft` = `getBoundingClientRect().left` injected per session | ALIGNED | Their SKILL gotcha #3 — now our §8.3 contract note 1 |
| §8.3/8.4 interaction | `controllers/element-interaction-controller.ts:201` | `ElementInteractionController` (690 LOC): pending→dragging machine, drop-target, group-move commit | ALIGNED | Spec 05 §14.4's six-point pattern 1:1 (verified by scout R8-A §5.1) |
| §8.4 trim | `controllers/resize-controller.ts:82` | `ResizeController` (302 LOC): trim-drag machine, preview/commit | ALIGNED | Consumes `ops/group-resize.ts` |
| §8.6 playhead | `controllers/playhead-controller.ts:102` | `PlayheadController` (312 LOC): scrub machine | ALIGNED | Arrow-key frame-nudge NOT ported yet (W4/W5) — spec 16 §3.1 stays SPEC-ONLY |
| §5.2 zoom gesture | `controllers/zoom-controller.ts:42` | `ZoomController` (157 LOC): Ctrl-wheel exponential, anchor scroll-keep | ALIGNED | |
| §8.3 drop targeting | `controllers/drop-target.ts:109/:272` | `computeDropTarget`, `getDropLineY` | ALIGNED | Vertical drop resolution (new-track vs existing) |
| §14.5 placement | `placement/index.ts:43-54/:381` | `PlacementStrategy` 5 variants; `resolveTrackPlacement`; reject-not-shift | ALIGNED | Faithful port of OC §14.5 |
| §14.5A zero-anchor | `placement/index.ts:167-197` | `enforceMainTrackStart` — the magnetic clamp semantics | ALIGNED | **The source of §14.5A** (Round-8 absorption) |
| Placement mutation | `placement/apply.ts:39-74/:117/:159` | `buildEmptyTrack` ×7 overloads; `updateTrackInSceneTracks`; `applyPlacement` | ALIGNED | |
| §14.6 snapping | `snapping/index.ts:23/:48/:73` | 6 `SnapPointType`s; `getTimelineSnapThresholdInTicks` (10px/pps); `resolveTimelineSnap` closest-wins | ALIGNED | Keyframe source replaced by an open seam in OT — we snap to keyframes via that seam |
| Ripple (spec 06 §5.4) | `ripple/index.ts:16/:40/:121` | `rippleShiftElements`/`applyRippleAdjustments`/`computeRippleAdjustments` | ALIGNED | The diff-based algorithm spec 06 adopts |
| Split (spec 06 §5.1) | `ops/split.ts:28/:39` | `SplitElementsParams` (retainSide); `splitElementsOnTracks` | ALIGNED | Snap-once source spans |
| Group resize (spec 06 §5.2) | `ops/group-resize.ts:41/:54/:147` | `ResizeSide`/`buildResizeMembers`/`computeGroupResize` | ALIGNED | Trim with snap-once + min 1 frame |
| Group move (spec 15 §4.3.3) | `ops/group-move.ts:63/:69/:163/:258` | `PlannedTrackCreation`/`PlannedElementMove`/`buildMoveGroup`/`resolveGroupMove` | ALIGNED | `PlannedElementMove` matches spec 15 field-for-field (scout VC5) |
| Core engine | `ops/timeline-core.ts:209` | `TimelineCore`: insert/move/trim/split/delete/rippleDelete/duplicate/updateElements + preview/commit + snapshot undo (986 LOC) | ALIGNED | Accidentally implements spec 15 §4.2's manager-method names 1:1 |
| Waveform | `render/waveform.ts:26/:90/:118` | `computeWaveformPeaks`/`drawWaveform`/`measureDrawnColumnHeight` | ALIGNED | Feeds §7.2 |
| Compositor seam | `render/placeholder-compositor.ts:116` | `setTracks()/renderFrame(t)` Canvas2D contract | ALIGNED | Decision 12.4's render seam (unchanged from 11.4, strengthened) — engine's WebGPU compositor plugs in behind; the one-way projector feeds `setTracks` |
| Virtual media | `media/virtual-media.ts:39-135` | `TEST_COLORS`/`TEST_TONES_HZ`/`MediaRegistry`/`goertzelPower` | REFERENCE | Test-only media (mirrors nle-engine pattern) |
| Headless API | `headless/api.ts:38-102` | 18-type prefixed union; `CommandResult {ok, code…}`; `apply`/`applyBatch` atomic | CORRECTIVE | C7 rename pass chartered (spec 19 §6): `timeline.*`/`track.*` prefixes are NOT spec-15 shape |

### 16.5A. Round-15 amendment — the projector clauses (ARCH-R15 §2.2; Decision 16)

The R15 assembly ruling amends this stream's code-reference posture with four projector clauses (full ruling: `audits/ARCH-R15-assembly-and-path.md` §2.2; the impact-map row "§16.5 amended" resolves HERE):

1. **The projector is ENGINE-home.** `nle-engine/src/lib/nle/projector/` — a fenced, ADDITIVE engine module (D9's additive-change rule; same-commit freeze-list update) importing opencut-timeline's `SceneTracks` TYPE-ONLY, exactly per the existing precedent (`nle-engine/src/lib/nle/bridge/scene-to-segments.ts:43` — `import type { SceneTracks, … }`, zero runtime dep on OT). The app's `src/projector/` is a THIN call site. Rationale: the projector owns rate/timebase reconciliation, transition-window translation, keyframe normalization, composition mapping — that IS timeline semantics; app-home would create the third timeline-semantics home Decision 12 eliminated.
2. **Contract:** `projectScene(scene: SceneTracks, ctx) → engine ingestion`, feeding render + the audio path + export. ONE-WAY by law (D12): *editing state* never flows engine→OT (telemetry flows UP a separate seam — ARCH-R15 §2.3bis).
3. **The engine `Timeline` class is the parity ORACLE while the projector matures; retirement = permanent internal test substrate.** Parity gates (pixel-exact on a shared fixture corpus) run in **engine CI** (its 8-min real-WebGPU milestone venue + vitest). "Retirement" means every engine consumer re-points to projector-ingested structures + the wire re-points — at that point the class becomes the engine's **permanent internal test substrate** (its 265-row browser runner keeps driving it) unless a later engine-side decision deletes it; deletion is an engine-internal call, not an app-round promise.
4. **Op-port table (engine → opencut-timeline, waves 1–2).** The engine Timeline's op families port INTO OT's engine layer — algorithms carried, tests carried, OT's W8-f/W9 panel re-convened per wave:

| Op family | Engine source (`timeline.ts`) | Wave | Destination |
|---|---|---|---|
| slip | `:4143` | 1 (A2) | OT ops + invariant system + carried tests |
| slide | `:4246` | 1 (A2) | OT ops |
| rollingTrim | `:2984` | 1 (A2) | OT ops |
| rateStretch | `:3155` | 1 (A2) | OT ops |
| retime / freezeFrame / rangeRemoval (closeGap, joinItems) | `:7163` / `:6158` / `:7319` | 2 (A2.5) | OT ops + model extensions if spec'd |

(Wave/phase ownership: ARCH-R15 §2.3 item 2 + §3.4's A2/A2.5 rows.)

### 16.6. Inline-code classification (R9 sampled audit — 00-master §2.5.2 enforcement)

This spec carries 42 inline TS blocks. The R9 sampled classification (15 blocks, stratified by section): **(a) data/protocol shapes** — `TimelineViewState` (BLOCK-1), `ToolMode` (BLOCK-8) — legitimate spec content, stays; **(b) prescriptive UI/interaction skeletons** — the component skeletons (`ClipFilmstrip`/`ClipWaveform`/`TimelineElement`/`TrimHandles`), the interaction hooks (`useVisibleElements`/`useTimelineDrag`/`useTrim`/`useMarquee`), the handlers (`handleClick`/`handleRazorClick`/`TimelinePlayhead`) — these were written BEFORE opencut-timeline's W4 landed and remain this spec's own component-hierarchy contract ("should be" form); they are not copies of repo code, so they are not class (d) violations. **Where OT now has the real component/controller, §16.5's table row is the citation of record and the skeleton is the shape summary — the two coexist by design (skeleton = contract, table = implementation pointer), not redundancy.** Full-block classification (all 42, plus 01's 67 and 06's 68) is the seal-round audit item (19 §12 item 6); the expected finding per this sample is few-to-zero class (d) blocks in this spec, with 01/06 (engine-side, written against freecut source with quoting-style scouts) the likelier carriers.

---

## 17. Corrections to Seed Spec

The seed spec assumed several patterns that did not survive contact with the actual source code. Each correction cites the source.

### 17.1 ❌ "IntersectionObserver virtualization" (§14 question 2)

**Seed claim:** "Document the `IntersectionObserver` virtualization" in OpenCut-classic's `timeline-track.tsx` / `timeline-element.tsx`.

**Actual:** No `IntersectionObserver` is used in OpenCut-classic's timeline. `grep -r IntersectionObserver /tmp/opencut-classic/apps/web/src/timeline/` returns zero matches. Track-level virtualization is implicit (only mounted tracks render — typically 5–20 rows). The only window-based culling in OpenCut-classic is **ruler tick culling** in `timeline-ruler.tsx:50-98`, which uses `useScrollPosition` + math, not `IntersectionObserver`.

**Neither repo uses IntersectionObserver in the timeline viewport itself.** FreeCut's `use-clip-visibility.ts` (145 LOC, `hooks/use-clip-visibility.ts:37-98`) **deliberately avoids** per-clip observers — it derives `isVisible` from `useTimelineViewportStore` + `useSyncExternalStore` (scroll-math over clip geometry in `timeline-content` coordinates). Its own doc comment (line 30-31) explicitly states: "avoids per-clip scroll listeners/observers". Some **stale JSDoc comments** mention `IntersectionObserver` in `clip-filmstrip/index.tsx:44`, `clip-waveform/index.tsx:48`, and `image-filmstrip.tsx:21` — they describe the `isVisible` prop's provenance incorrectly (the prop is now sourced from `useClipVisibility`'s viewport-store derivation, not from a DOM observer). IntersectionObserver **is** used elsewhere in FreeCut — at `keyframes/dopesheet-editor/index.tsx:774` and `editor/compose-workspace/compositing-timeline.tsx:1547` — but those are unrelated features outside the timeline viewport.

DOM mounting of clips in FreeCut is driven by `use-visible-items.ts` (frame-range math from `getTimelineItemsForFrameRange`), NOT by IntersectionObserver.

**Correction to §6 / §6.1:** Replace "OpenCut-classic uses IntersectionObserver for virtualization" with "OpenCut-classic does not virtualize tracks or clips at all — it relies on the typical project having <100 clips. FreeCut virtualizes via frame-range math in `use-visible-items.ts` (visible-set membership derived from `useTimelineViewportStore` + scroll math, not DOM observation)."

### 17.2 ❌ "TanStack Virtual" (§6.1 implied)

**Seed claim:** "Library used (TanStack Virtual? Custom?)" — ambiguous.

**Actual:** Neither repo uses TanStack Virtual / `react-virtual` / `react-window`. `grep -r "tanstack|react-virtual|useVirtualizer|react-window" /tmp/opencut-classic/apps/web/src/timeline /tmp/freecut/src/features/timeline` returns zero matches in timeline code. Both repos roll their own:

- **OpenCut-classic:** No virtualization layer for clips/tracks. Only ruler ticks are windowed.
- **FreeCut:** Custom `useVisibleItems` (`hooks/use-visible-items.ts`, 873 LOC) computes a `VisibleFrameRange { start, end }` from `viewportWidth` × `pixelsPerSecond` + buffer, with hysteresis (`HYSTERESIS_PX = 800`, `:32`) and clip-budget incremental mount/unmount (`expandRangeByClipBudget` / `contractRangeByClipBudget`, `:136-235`). State is shared via `useSyncExternalStore` + per-track listener sets (`:49-87`).

**Correction to §6.1:** Specify "Custom virtualization — no third-party library. See `FC/hooks/use-visible-items.ts` for the algorithm."

### 17.3 ❌ "OpenCut-classic has no density mode" (§3)

**Seed claim (table row):** "Density mode: OpenCut-classic — None".

**Actual:** ✅ Verified correct. OpenCut-classic has no density/overview mode. FreeCut's density mode is real: `utils/timeline-dom-density.ts` (115 LOC), `components/timeline-density-overview.tsx`, `utils/timeline-density-overview.ts`, `utils/hybrid-timeline-density.ts`. Activation threshold: `DENSE_TIMELINE_TRACK_ITEM_THRESHOLD = 80` items on a single track (`utils/timeline-dom-density.ts:6`).

### 17.4 ❌ "Ruler: OpenCut-classic — DOM" (§3)

**Seed claim:** OpenCut-classic ruler is DOM, FreeCut ruler is canvas.

**Actual:** ✅ Verified correct. `OC/components/timeline-ruler.tsx:88-98` mounts `<TimelineTick>` elements (DOM). `FC/components/timeline-ruler-viewport-canvas.ts:32-113` is a Canvas 2D drawing function. **However**, FreeCut's canvas is wrapped by a DOM surface component (`components/timeline-ruler-surface.tsx`) that owns pointer events.

### 17.5 ❌ "Filmstrip thumbnails: OpenCut-classic — Canvas (wavesurfer.js, listed but unused)" (§3)

**Seed claim:** wavesurfer.js listed but unused.

**Actual:** No wavesurfer.js reference found in OpenCut-classic's source. `grep -ri wavesurfer /tmp/opencut-classic/apps/web/src` returns zero hits (across the entire `apps/web/src/` tree, not just `timeline/`), and `grep wavesurfer /tmp/opencut-classic/package.json` also returns zero hits — so wavesurfer is **neither listed nor used**. The seed spec's "listed but unused" was completely wrong. OpenCut-classic does have an `AudioWaveform` component (`components/audio-waveform.tsx`, 352 LOC) that uses Canvas 2D directly via `waveformCache.getSourceSummary` (`:277-302`).

✅ VERIFIED — OpenCut-classic **DOES** render filmstrip thumbnails via DOM/CSS `backgroundImage: url(...)` tiling pattern in `TiledMediaContent` at `timeline-element.tsx:1084-1133`. The component is dispatched from the `ElementContent` switch (`timeline-element.tsx:1166-1181`) for `video` and `image` elements. The CSS pattern is:

```tsx
<div className="absolute inset-0" style={{
  backgroundColor: "var(--muted)",
  backgroundImage: `url(${imageUrl})`,       // mediaAsset.thumbnailUrl (or .url for images)
  backgroundRepeat: "repeat-x",
  backgroundSize: `${tileWidth}px ${trackHeight}px`,
  backgroundPosition: "left center",
  pointerEvents: "none",
}} />
```

This is **DOM-based (CSS background)**, not Canvas-based like FreeCut — but it IS filmstrip rendering. For `text` / `effect` / `sticker` / `graphic` / `audio` elements no filmstrip is rendered (those use text/icon-based content). When no `thumbnailUrl` is available for a video/image element, `TiledMediaContent` falls back to rendering the element's name as a `<span>` (`timeline-element.tsx:1099-1105`).

**Note on the seed vs. refined history:** The seed spec claimed "Canvas (wavesurfer.js, listed but unused)". The original SCOUT-05 refinement over-corrected to "No filmstrip thumbnail rendering exists in OpenCut-classic's timeline directory at all — elements render as solid colored blocks" — this was ALSO wrong. The truth is between the two: wavesurfer is not used (seed was wrong), but filmstrip IS rendered via DOM/CSS `backgroundImage` tiling (over-correction was wrong). This matches the spec's overall thesis that OpenCut-classic is the DOM-based reference — including for filmstrip.

**Correction to §3 / §7.1:** "Filmstrip thumbnails: OpenCut-classic — DOM/CSS `backgroundImage` tiling (`TiledMediaContent` at `timeline-element.tsx:1084-1133`, no wavesurfer.js). FreeCut — Canvas (tiled, `components/clip-filmstrip/`)." Both repos render filmstrip for video/image clips; OpenCut-classic does it DOM/CSS-based, FreeCut does it Canvas-based.

### 17.6 ❌ "OpenCut-classic hooks `use-timeline-drag.ts`, `use-timeline-resize.ts`" (§14 Q8)

**Seed claim:** File names `use-timeline-drag.ts` and `use-timeline-resize.ts`.

**Actual:** Files are named `use-timeline-drag-drop.ts` (library DnD) and `use-timeline-resize.ts` (element trim). The element-body drag hook is `hooks/element/use-element-interaction.ts`. See §14.8 above for the full mapping.

### 17.7 ❌ "OpenCut-classic controllers directory contains `drag-drop.ts`, `resize.ts`, `seek.ts`, `playhead.ts`, `zoom.ts`, `keyframe-drag.ts`, `element-interaction.ts`" (§14 Q4)

**Seed claim:** Filenames without `-controller` suffix.

**Actual:** Every file is suffixed `-controller.ts`: `drag-drop-controller.ts`, `resize-controller.ts`, `seek-controller.ts`, `playhead-controller.ts`, `zoom-controller.ts`, `keyframe-drag-controller.ts`, `element-interaction-controller.ts`. Total: 7 controllers, 2,863 LOC combined.

### 17.8 ❌ "FreeCut `timeline-item/` has ~50 files" (§14 Q10)

**Seed claim:** "List and read all 50+ files in this directory."

**Actual:** **65 files total** (verified via `ls | wc -l`). Breakdown: 38 production source files (.tsx/.ts, no test suffix), 18 test files (.test.tsx/.test.ts), and 9 utility/state files (pure helpers/predicates/constants). See §18 for the complete inventory.

### 17.9 ❌ "Ruler canvas crossover point" (§14 Critical Things)

**Seed question:** "When does canvas become worth it [for the ruler]?"

**Actual:** FreeCut's `drawTimelineRulerViewportCanvas` (`FC/components/timeline-ruler-viewport-canvas.ts:71-75`) suppresses minor ticks when `visibleMarkerCount >= MAX_VISIBLE_MINOR_MARKERS (72)` OR `minorSpacing < MIN_MINOR_TICK_SPACING_PX (14)`. So the implicit crossover is **~72 visible major intervals**. Below that, DOM is fine. Above that, canvas pays for itself by collapsing per-tick React reconciliations into a single `fillText`/`stroke` batch.

**Correction to §5/§7:** Specify the crossover as "≥72 visible ticks → canvas ruler; <72 → DOM ruler."

### 17.10 ❌ "Buffer size for virtualization" (§6 Critical Things)

**Seed question:** "Buffer size?"

**Actual:**
- **FreeCut item virtualization:** `DEFAULT_TIMELINE_ITEM_CULL_BUFFER_PX = 2000` (normal tracks), `DENSE_TIMELINE_ITEM_CULL_BUFFER_PX = 600` (dense tracks ≥80 items). Source: `utils/timeline-dom-density.ts:14-15`. Hysteresis: `HYSTERESIS_PX = 800` (`hooks/use-visible-items.ts:32`).
- **FreeCut filmstrip/waveform tile prefetch:** `CLIP_VISIBILITY_PREFETCH_MARGIN_PX = 600` (`hooks/use-clip-visibility.ts:12`), `VIEWPORT_PAD_TILES = 2`, `VIEWPORT_PAD_PX = 600` (`components/clip-filmstrip/index.tsx:19-20`).
- **OpenCut-classic ruler tick buffer:** `bufferPx = Math.max(200, (scrollLeft + viewportWidth) * 0.15)` (`components/timeline-ruler.tsx:56`) — 15% of viewport, minimum 200px.

### 17.11 ❌ "Vertical virtualization (tracks)" (§6.2 implied)

**Seed claim:** Implied both repos virtualize tracks vertically.

**Actual:** **Neither repo virtualizes tracks vertically.** Both render every track. OpenCut-classic uses `TRACKS_CONTAINER_MAX_HEIGHT = 800` and lets the `ScrollArea` scroll vertically (`components/index.tsx:91, :503-573`). FreeCut splits tracks into A/V panes with separate scroll containers but mounts every track (`timeline.tsx:1031-1060`). Vertical virtualization is unnecessary because timelines typically have <30 tracks; horizontal (time-axis) virtualization is the dominant concern.

---

## 18. FreeCut `timeline-item/` Component Inventory

**Directory:** `/tmp/freecut/src/features/timeline/components/timeline-item/`
**Total files:** 65 (38 production + 9 utility/state + 18 tests). All 65 entries are listed below; test files (rows 48–65) are included for completeness.

| # | File | LOC | Purpose (1-line) |
|---|---|---|---|
| 1 | `index.tsx` | 1304 | `TimelineItem` (memo) — composition root for a single clip; wires 7 interaction hooks (drag, trim, stretch, slip-slide, track-push, caption, auto-transcript). |
| 2 | `clip-content.tsx` | 996 | `ClipContent` — main renderer; dispatches to width-gated media / detailed / compact variants. |
| 3 | `clip-floating-layer.tsx` | 128 | `ClipFloatingLayer` — overlays shown above clip during drag/trim (readout, tool overlay, follower ghost). |
| 4 | `clip-indicators.tsx` | 266 | `ClipIndicators` — small badges for keyframes, motion, reversed, broken media, linked-sync, reverse-conform status. |
| 5 | `clip-cursor.ts` | 75 | Pure helper that resolves the CSS cursor class for the current tool+edge+intent (trim/roll/slip/slide/etc.). |
| 6 | `drag-blocked-tooltip.tsx` | 38 | `DragBlockedTooltip` — portal-rendered warning shown when a drag is attempted on a locked track or constrained edge. |
| 7 | `drag-ghosts.tsx` | 34 | `FollowerDragGhost` — dashed-border ghost box for alt-drag followers (initially `display:none`, shown via direct DOM). |
| 8 | `drag-visual-mode.ts` | 81 | Pure helpers `getTimelineItemDragParticipation`, `shouldDimTimelineItemForDrag`, `TimelineItemGestureMode`. |
| 9 | `edge-halos.tsx` | 76 | `EdgeHalos` — soft glow on the active edge during trim/roll/slip/slide. |
| 10 | `floating-readout.tsx` | 53 | `FloatingReadout` — small floating label anchored to a ref (used by trim/fade handles to show timecode delta). |
| 11 | `hover-layout.ts` | 12 | `getTimelineClipLabelRowHeightPx` — reads `--editor-timeline-clip-label-row-height` CSS var. |
| 12 | `item-context-menu.tsx` | 711 | `ItemContextMenu` — right-click menu with 8 sections (join, link, keyframe, scene-detection, caption, composition, media, layout, destructive). Lazy-mount on first right-click. |
| 13 | `join-indicators.tsx` | 116 | `JoinIndicators` (zoom-gated) — visual hint that an adjacent clip is joinable. |
| 14 | `linked-sync-badge.ts` | 38 | `shouldSuppressLinkedSyncBadge` — predicate for hiding the linked-sync badge when gestures don't apply. |
| 15 | `post-drag-click-guard.ts` | 12 | `shouldSuppressTimelineItemClickAfterDrag` — prevents the click that follows a drag from re-selecting. |
| 16 | `segment-status-overlays.tsx` | 82 | `SegmentStatusOverlays` — colored bars over clip segments showing scene-detection / silence-removal / filler-removal progress. |
| 17 | `stretch-handles.tsx` | 82 | `StretchHandles` — rate-stretch left/right edge handles; orange by default, red when constrained. |
| 18 | `timeline-item-memo-compare.ts` | 66 | Custom `React.memo` comparator whitelisting the visual props that affect rendering. |
| 19 | `tool-operation-overlay.tsx` | 61 | `ToolOperationOverlay` — bounds-box overlay rendered during trim/ripple/roll/slip/slide/stretch. |
| 20 | `tool-operation-overlay-utils.ts` | 553 | Pure math for `getTrimOperationBoundsVisual`, `getSlipOperationBoundsVisual`, etc. |
| 21 | `track-push-handle.tsx` | 75 | `TrackPushHandle` — small hit zone in the gap left of a clip; mousedown initiates a track-push (closes/opens gaps). |
| 22 | `transcribe-dialog-controller.tsx` | 100 | `TranscribeDialogController` — lazy-mount dialog controller for transcription jobs. |
| 23 | `transition-drop-ghost.tsx` | 34 | `TransitionDropGhost` — ghost preview shown when a transition is being dragged onto an edit point. |
| 24 | `trim-constants.ts` | 24 | `FREE_COLORS`, `CONSTRAINED_COLORS`, `ActiveEdgeState` type. |
| 25 | `trim-handles.tsx` | 267 | `TrimHandles` — left/right trim edges with mode-aware colors (trim/ripple/roll) + join hover indicators. |
| 26 | `trim-info-overlay.tsx` | 67 | `TrimInfoOverlay` — floating timecode delta label anchored to the active trim handle. |
| 27 | `use-active-global-cursor.ts` | 96 | Sets the document-level cursor class during an active gesture (trim/stretch/slip/slide/track-push). |
| 28 | `use-auto-transcript-captions.ts` | 63 | Auto-enables transcript-backed captions the first time a clip's media gets a transcript. |
| 29 | `use-caption-dialog-state.ts` | 242 | State machine for caption generation / extraction / consolidation dialog. |
| 30 | `use-clip-neighbors.ts` | 73 | Reactive adjacency: left/right strictly-adjacent neighbors + gap-before info. |
| 31 | `use-clip-readout-labels.ts` | 61 | Formats timecode labels for trim/fade readouts (signed frame delta strings). |
| 32 | `use-context-menu-state.ts` | 49 | `useContextMenuState` — tracks which edge is closer to the right-click point. |
| 33 | `use-drag-visual-state.ts` | 278 | Computes the per-clip drag visual mode (anchor / follower / dimmed / hidden). |
| 34 | `use-edit-preview-shifts.ts` | 279 | Computes preview shifts for linked items during drag/trim so linked A/V pairs move in lockstep. |
| 35 | `use-fade-editors.ts` | 920 | Mouse handlers for audio/video fade handles + curve-dot editing; writes live gains to mixer store. |
| 36 | `use-fade-math.ts` | 277 | Pure math: ratios and labels for audio/video fade in/out. |
| 37 | `use-linked-sync-preview.ts` | 164 | Drives the linked-sync badge + ripple preview for the linked A/V companion of an edited clip. |
| 38 | `use-smart-trim-hover.ts` | 213 | Resolves `SmartTrimIntent` / `SmartBodyIntent` from pointer position to drive cursor + edge highlighting. |
| 39 | `use-timeline-item-actions.ts` | 619 | Builds the context-menu action callbacks (split, join, link, reverse, freeze-frame, scene-detect, captions, etc.). |
| 40 | `use-timeline-item-bounds.ts` | 316 | Computes the displayed left/width/height of a clip under any active gesture (drag, trim, stretch, slip, slide). |
| 41 | `use-timeline-item-drop-handlers.ts` | 338 | Drop-target detection for effects, transitions, and track-push onto this clip. |
| 42 | `use-timeline-item-pointer-handlers.ts` | 392 | Master pointer-handler dispatcher: decides from `activeTool` + pointer position which gesture to start (trim, roll, slip, slide, stretch, razor, transition). |
| 43 | `use-tool-operation-overlay.ts` | 241 | Selects which `OperationBoundsVisual` to render based on the active gesture. |
| 44 | `video-fade-handles.tsx` | 143 | `VideoFadeHandles` — fade in/out handles for video (visual fade, not audio). |
| 45 | `visual-fade-items.ts` | 5 | `supportsVisualFadeControls` — predicate: video or composition only. |
| 46 | `audio-volume-control.tsx` | 107 | `AudioVolumeControl` — inline volume slider on audio clips. |
| 47 | `audio-fade-handles.tsx` | 191 | `AudioFadeHandles` — fade in/out handles + curve-dot editing for audio. |
| 48 | `audio-fade-handles.test.tsx` | 59 | Tests for `AudioFadeHandles`. |
| 49 | `audio-volume-control.test.tsx` | 104 | Tests for `AudioVolumeControl`. |
| 50 | `clip-content.test.tsx` | 1338 | Tests for `ClipContent` (largest test file in directory). |
| 51 | `clip-cursor.test.ts` | 107 | Tests for cursor-class resolution. |
| 52 | `clip-indicators.test.tsx` | 76 | Tests for `ClipIndicators`. |
| 53 | `drag-visual-mode.test.ts` | 147 | Tests for `getTimelineItemDragParticipation` / `shouldDimTimelineItemForDrag`. |
| 54 | `hover-layout.test.ts` | 24 | Tests for `getTimelineClipLabelRowHeightPx`. |
| 55 | `item-context-menu.test.tsx` | 203 | Tests for `ItemContextMenu`. |
| 56 | `join-indicators.test.tsx` | 93 | Tests for `JoinIndicators`. |
| 57 | `linked-sync-badge.test.ts` | 64 | Tests for `shouldSuppressLinkedSyncBadge`. |
| 58 | `post-drag-click-guard.test.ts` | 23 | Tests for `shouldSuppressTimelineItemClickAfterDrag`. |
| 59 | `tool-operation-overlay-utils.test.ts` | 362 | Tests for the bounds-visual math. |
| 60 | `trim-handles.test.tsx` | 211 | Tests for `TrimHandles`. |
| 61 | `use-drag-visual-state.test.tsx` | 242 | Tests for `use-drag-visual-state`. |
| 62 | `use-timeline-item-bounds.test.tsx` | 102 | Tests for `use-timeline-item-bounds`. |
| 63 | `use-timeline-item-pointer-handlers.test.tsx` | 243 | Tests for `use-timeline-item-pointer-handlers`. |
| 64 | `video-fade-handles.test.tsx` | 97 | Tests for `VideoFadeHandles`. |
| 65 | `visual-fade-items.test.ts` | 48 | Tests for `supportsVisualFadeControls`. |

**Total production LOC:** ~13,961 (excluding tests).

---

## 19. Keyboard Shortcut Mapping

**Sources:**
- **OpenCut-classic:** `OC-Actions/definitions.ts:155-179` — `ACTION_DEFAULT_SHORTCUTS` array. Single source of truth, action-keyed.
- **FreeCut:** `FC/config/hotkeys.ts:8-97` — `HOTKEYS` map. Key-keyed. Hooks consume via `useResolvedHotkeys()` and `useHotkeys()` from `react-hotkeys-hook`.

**Convention:** `mod` = `Cmd` on macOS, `Ctrl` on Windows/Linux (FreeCut). OpenCut-classic treats `ctrl` as Cmd-equivalent (`actions/keybinding.ts:5-6`).

### 19.1 Unified shortcut table (union of both repos)

| Action | OpenCut-classic | FreeCut | Recommended (union) | Notes |
|---|---|---|---|---|
| **Playback** | | | | |
| Play/Pause toggle | `space`, `k` | `space` | `space` | FreeCut uses `k` for keyframe add; OpenCut-classic uses `k` as alt play/pause. Recommend `space` only. |
| Shuttle forward | `l` | `l` | `l` | JKL shuttle, both repos agree. |
| Shuttle reverse | `j` | `j` | `j` | Both agree. |
| Pause (JKL only) | — | `k` | `k` (when playing) | FreeCut reserves `k` for "pause while transport active". |
| **Frame navigation** | | | | |
| Frame step back | `left` | `left` | `left` | Both agree. |
| Frame step forward | `right` | `right` | `right` | Both agree. |
| Jump back 5s | `shift+left` | — | `shift+left` | OpenCut-classic only. FreeCut uses Shift+arrows for nudging. |
| Jump forward 5s | `shift+right` | — | `shift+right` | OpenCut-classic only. |
| Go to start | `home`, `enter` | `home` | `home` | OpenCut-classic also allows `enter`. |
| Go to end | `end` | `end` | `end` | Both agree. |
| Next snap point | — | `down` | `down` | FreeCut only. Useful for keyboard-only navigation. |
| Previous snap point | — | `up` | `up` | FreeCut only. |
| **Editing** | | | | |
| Split at playhead | `s` | `alt+c` | `s` | OpenCut-classic's `s` is more direct; FreeCut reserves `s` for snap toggle. **Conflict** — recommend `s` for split (FreeCut snap toggle moves to `n`). |
| Split and remove left | `q` | — | `q` | OpenCut-classic only. |
| Split and remove right | `w` | — | `w` | OpenCut-classic only. |
| Split at cursor (hovered item) | — | `shift+c` | `shift+c` | FreeCut only. |
| Split all items at playhead | — | `alt+c` | `alt+c` | FreeCut only. |
| Delete selected | `backspace`, `delete` | `delete`, `backspace` | `delete`, `backspace` | Both agree. |
| Ripple delete | — | `mod+delete`, `mod+backspace` | `mod+delete` | FreeCut only. OpenCut-classic has no ripple-delete shortcut (must use ripple-editing toggle + delete). |
| Join selected | — | `shift+j` | `shift+j` | FreeCut only. |
| Duplicate selected | `ctrl+d` | — | `ctrl+d` | OpenCut-classic only. FreeCut uses Ctrl+C/V for the same effect. |
| Freeze frame at playhead | — | `shift+f` | `shift+f` | FreeCut only. |
| Link A/V | — | `mod+alt+l` | `mod+alt+l` | FreeCut only. |
| Unlink A/V | — | `alt+shift+l` | `alt+shift+l` | FreeCut only. |
| Toggle linked selection | — | `shift+l` | `shift+l` | FreeCut only. |
| Nudge visual item 1px | — | `shift+arrows` | `shift+arrows` | FreeCut only. Note conflict with OpenCut-classic's "Jump back/forward 5s". |
| Nudge visual item 10px | — | `mod+shift+arrows` | `mod+shift+arrows` | FreeCut only. |
| Clear all keyframes | — | `shift+a` | `shift+a` | FreeCut only. |
| **Tools** | | | | |
| Selection tool | — | `v` | `v` | FreeCut only. OpenCut-classic has no tool-mode shortcuts (toolbar clicks only). |
| Trim edit tool | — | `t` | `t` | FreeCut only. |
| Razor tool | — | `c` | `c` | FreeCut only. |
| Rate stretch tool | — | `r` | `r` | FreeCut only. |
| Slip tool | — | `y` | `y` | FreeCut only (gated by `SLIP_SLIDE_TOOLS_ENABLED`). |
| Slide tool | — | `u` | `u` | FreeCut only (gated by `SLIP_SLIDE_TOOLS_ENABLED`). |
| **Markers & In/Out** | | | | |
| Toggle bookmark | (toolbar button) | `m` | `m` | FreeCut only. OpenCut-classic uses toolbar. |
| Remove marker | — | `shift+m` | `shift+m` | FreeCut only. |
| Previous marker | — | `[` (`bracketleft`) | `[` | FreeCut only. |
| Next marker | — | `]` (`bracketright`) | `]` | FreeCut only. |
| Mark In | — | `i` | `i` | FreeCut only. |
| Mark Out | — | `o` | `o` | FreeCut only. |
| Mark In at preview | — | `shift+i` | `shift+i` | FreeCut only (gray playhead). |
| Mark Out at preview | — | `shift+o` | `shift+o` | FreeCut only. |
| Clear In/Out | — | `alt+x` | `alt+x` | FreeCut only. |
| Insert edit (source → timeline) | — | `,` (`comma`) | `,` | FreeCut only. |
| Overwrite edit (source → timeline) | — | `.` (`period`) | `.` | FreeCut only. |
| **UI** | | | | |
| Toggle snapping | `n` | `s` | `n` | **Conflict** — OpenCut-classic uses `n`; FreeCut uses `s`. Recommend `n` (avoids `s` conflict with split). |
| Toggle ripple editing | (toolbar button) | — | (toolbar button) | OpenCut-classic toolbar only. |
| Toggle canvas/gizmo snap | — | `shift+s` | `shift+s` | FreeCut only. |
| Undo | `ctrl+z` | `mod+z` | `mod+z` | Both agree (mod convention). |
| Redo | `ctrl+shift+z`, `ctrl+y` | `mod+shift+z` | `mod+shift+z` | Both agree. |
| Zoom in | (Ctrl+wheel) | `mod+=` (`mod+equal`) | `mod+=`, Ctrl+wheel | Both. |
| Zoom out | (Ctrl+wheel) | `mod+-` (`mod+minus`) | `mod+-`, Ctrl+wheel | Both. |
| Zoom to fit | (toolbar) | `\` (`backslash`) | `\` | FreeCut only. |
| Zoom to 100% | — | `shift+\`, `mod+0` | `shift+\` | FreeCut only. |
| **Clipboard** | | | | |
| Copy | `ctrl+c` | `mod+c` | `mod+c` | Both agree. |
| Cut | — | `mod+x` | `mod+x` | FreeCut only. |
| Paste | `ctrl+v` | `mod+v` | `mod+v` | Both agree. |
| **Selection** | | | | |
| Select all | `ctrl+a` | — | `ctrl+a` | OpenCut-classic only. |
| Deselect all | — | — | (Escape) | Neither has a dedicated shortcut; both use Escape for cancel. |
| Cancel interaction | `escape` | — | `escape` | OpenCut-classic only; FreeCut uses Escape for composition-exit. |
| **Workspaces** | | | | |
| Workspace: Edit | — | `alt+1` | `alt+1` | FreeCut only. |
| Workspace: Color | — | `alt+2` | `alt+2` | FreeCut only. |
| Workspace: Animate | — | `alt+3` | `alt+3` | FreeCut only. |
| Open Scene Browser | — | `mod+shift+f` | `mod+shift+f` | FreeCut only. |
| **File** | | | | |
| Save | — | `mod+s` | `mod+s` | FreeCut only. |
| Export | — | `mod+shift+e` | `mod+shift+e` | FreeCut only. |
| **Keyframes** (when keyframe panel open) | | | | |
| Add keyframe | — | `k` | `k` | FreeCut only; conflicts with OpenCut-classic play/pause. |
| Previous keyframe | — | `alt+[` | `alt+[` | FreeCut only. |
| Next keyframe | — | `alt+]` | `alt+]` | FreeCut only. |
| Toggle auto-keyframe | — | `a` | `a` | FreeCut only. |
| Keyframe graph view | — | `1` | `1` | FreeCut only. |
| Keyframe dopesheet view | — | `2` | `2` | FreeCut only. |
| Keyframe split view | — | `3` | `3` | FreeCut only. |
| Fit keyframe panel | — | `f` | `f` | FreeCut only. |

### 19.2 Conflict resolution summary

| Conflict | OpenCut-classic | FreeCut | Recommendation |
|---|---|---|---|
| `s` | Split at playhead | Toggle snap | `s` = **Split at playhead**; move snap toggle to `n`. |
| `k` | Play/Pause | Pause (JKL) / Add keyframe | `k` = **Pause (JKL)** when playing; **Add keyframe** when keyframe panel focused. |
| `n` | Toggle snapping | (unused) | `n` = **Toggle snapping**. |
| `shift+arrows` | Jump 5 seconds | Nudge 1px | `shift+arrows` = **Nudge 1px** (more useful day-to-day); drop the 5s jump (use Home/End + marker nav instead). |
| `c` | (unused) | Razor tool | `c` = **Razor tool**. |

### 19.3 Shortcut count

- OpenCut-classic: **21 actions** with default shortcuts (`definitions.ts:155-179`), 23 total bindings (some actions have 2 keys).
- FreeCut: **68 HOTKEYS binding definitions** in the constant map at `config/hotkeys.ts:8-97`, consumed across **8 shortcut-hook files** (`hooks/shortcuts/*.ts`) via **59 `useHotkeys()` registrations** wired to handlers. All remappable via `useResolvedHotkeys` and persisted to localStorage.
- Union (recommended): **~50 actions** covering playback, navigation, editing, tools, markers, in/out, clipboard, UI, workspaces, file, and keyframes.

---

## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. Matrix rows: "Timeline virtualization",
> "Snap point computation", "Placement algorithm", "Filmstrip render",
> "Waveform render", "Drag-drop from library", "Keyboard interactions",
> "Zoom/scroll", "Playhead drag".
>
> **Primary testing path: Tier 3 (keyboard-driven).** The timeline has
> ~50 keyboard shortcuts (§19, spec 16), most of which map to `EngineCommand`
> types (spec 15 §4); UI-layer extensions (snap/ripple toggles, viewport
> zoom, etc.) route to the UI store instead — see spec 16 §0.2. Driving the timeline via `page.keyboard.press()`
> avoids the click/drag fragility tax of mouse-based UI tests (drag
> thresholds, pointermove timing, dragenter/dragleave sequencing) and
> asserts the **state WYSIWYG** invariant (spec 17 §6.1): every keyboard
> shortcut produces the same `SceneState` as the direct
> `engine.command.apply()` path. Tier 1 covers the placement/snap math;
> Tier 2 covers canvas paint and DOM node counts.

### Tier 1: Pure engine tests

[Filename: `tests/unit/05-timeline/<feature>.test.ts`]

- `placement-overlap-half-open-interval` — `wouldElementOverlap` returns
  false when `endTime === element.startTime` (touching, not overlapping)
  and false when `startTime === element.endTime`; returns true only when
  `startTime < elementEnd && endTime > elementStart` (overlap region)
- `placement-explicit-strategy-honors-trackId` — `resolveTrackPlacement`
  with `strategy.type === "explicit"` returns an `existingTrack` result
  for the caller-supplied `trackId`; no overlap check is performed
  (explicit overrides)
- `placement-firstAvailable-picks-compatible-non-overlapping-track` —
  scans `orderedTracks`, returns the first track of matching type where
  `canPlaceTimeSpansOnTrack` returns true; falls back to `alwaysNew` with
  `position: "highest"` when no existing track fits
- `placement-preferIndex-uses-preferred-then-resolves-above-below` —
  preferred track index used if compatible AND non-overlapping;
  otherwise `resolvePreferredNewTrackPlacement` resolves an above/below
  insert position
- `placement-aboveSource-tries-track-immediately-above-source` — picks
  the track at `sourceTrackIndex - 1`; on incompatible type or overlap,
  falls through to `firstAvailable` then `alwaysNew`
- `placement-alwaysNew-creates-fresh-track` — always returns a
  `newTrack` result; `position: "highest"` splices at top of stack,
  `"default"` at bottom of section
- `placement-type-compatibility-rejects-cross-type` — `canElementGoOnTrack`
  returns false for an `audio` element on a `video` track and true for
  an `audio` element on an `audio` track; `ELEMENT_TRACK_MAP` is the
  source of truth (no fuzzy compatibility)
- `placement-main-track-zero-anchor-clamps-early-start` —
  `enforceMainTrackStart` clamps placement time to `ZERO_MEDIA_TIME` if
  earlier than the earliest existing main-track element; downstream
  elements are not shifted (overlap policy is REJECTED, NOT SHIFTED)
- `snap-build-emits-all-five-source-types` — `buildTimelineSnapPoints`
  flattens `element-start`, `element-end`, `playhead`, `bookmark`, and
  `keyframe` sources into one array; each source is a lazy iterable
- `snap-threshold-is-zoom-aware` — `getTimelineSnapThresholdInTicks`
  at `pixelsPerSecond = 50` (default 1x zoom) returns
  `(10px / 50pps) * TICKS_PER_SECOND`; doubling zoom halves the threshold
  in ticks
- `snap-closest-wins-within-threshold` — `resolveTimelineSnap` returns
  the snap point with smallest `Math.abs(targetTime - snapPoint.time)`;
  returns `null` snapPoint when no point is within `maxSnapDistance`
- `snap-excludes-dragged-element-ids` — when building sources for resize,
  dragged element IDs are filtered out so an element does not snap to
  its own edge mid-drag
- `timeToPixel-multiplies-seconds-by-pps` — `timeToPixel(2s, 50pps) === 100`
  for `MediaTime` representing 2 seconds; identity at `pps = 1`
- `pixelToTime-divides-pixels-by-pps` — `pixelToTime(100, 50pps)` is the
  `MediaTime` for 2 seconds; inverse of `timeToPixel`
- `frameToPixel-composes-mediaTimeFromFrame-then-timeToPixel` — for
  `frame = 30, fps = 30, pps = 50`: `frameToPixel === timeToPixel(1s,
  50pps) === 50`
- `visible-elements-filter-half-open-interval-matches-viewport` — an
  element with `elStart === viewport.end` or `elEnd === viewport.start`
  is excluded (touching but not visible); an element straddling either
  edge is included
- `virtualization-buffer-pads-one-screen-each-side` — viewport is
  expanded by one screen of pixels on both left and right before
  filtering; total visible set equals `viewport ∪ buffer`

### Tier 2: Render tests

[Filename: `tests/integration/05-timeline/<feature>.render.test.ts`]

- `virtualization-100-clips-5-tracks-under-100ms-and-500-nodes` — loads
  `tests/fixtures/projects/100-clip-5-track.json`, mounts the timeline,
  measures `performance.now()` delta around first paint; asserts render
  time `< 100ms` and
  `page.evaluate(() => document.querySelectorAll('[data-testid="timeline-clip"]').length) < 500`
- `filmstrip-canvas-has-pixel-data` — loads a 60s video clip, awaits
  `filmstripService.getThumbnail()` resolution, then asserts
  `canvas.getContext('2d').getImageData(0, 0, width, height).data.some(v => v !== 0)`
- `waveform-canvas-has-peak-data` — loads an audio clip with non-silent
  PCM, awaits waveform extraction, asserts `getImageData` returns
  non-zero alpha values along the canvas (peaks rendered)
- `scroll-timeline-prunes-off-screen-clips-from-DOM` — after a 5-screen
  scroll-right via `page.mouse.wheel({ deltaX: 5000 })`, the DOM node
  count (`querySelectorAll('[data-testid="timeline-clip"]')`) stays
  below the buffer ceiling; scrolling back restores the originally
  pruned clips
- `zoom-in-out-resizes-clips-correctly` — `page.keyboard.press('+')`
  multiplies `pixelsPerSecond` by `TIMELINE_ZOOM_BUTTON_FACTOR` (1.7);
  clip DOM widths scale by 1.7x; pixel-diff against
  `tests/fixtures/references/100-clip-zoom-1.7x.png`, tolerance `5%`
  (layout-only diff, not pixel-perfect)
- `playhead-drag-seeks-to-correct-time` — `page.mouse.down()` on the
  playhead, `page.mouse.move()` to pixel `x = 250` at `pps = 50` (5s);
  asserts `engine.playback.getCurrentTime()` returns the `MediaTime`
  for 5s ± 1 frame
- `drag-drop-from-media-library-creates-new-clip` — uses
  `tests/fixtures/projects/multi-track-blend.json` (red main + green
  overlay); simulates drag from media library onto the overlay track at
  `x = 200`; asserts a new `VideoElement` appears in
  `SceneState.tracks.overlay` with `startTime` corresponding to pixel
  `x = 200` (± snap threshold)

### Tier 3: UI tests (PRIMARY PATH)

[Filename: `tests/integration/05-timeline/<feature>.ui.test.ts`]

[Every test below asserts state WYSIWYG: the `SceneState` after
`page.keyboard.press(shortcut)` must be deep-equal to the state after
`engine.command.apply({ type, params })` with the same parameters. The
direct-apply baseline is computed in the same Vitest process (Tier 1
engine instance). See spec 17 §6.1.]

- `keyboard-split-cmd-b` — `Cmd+B` issues `split` (spec 15 §5.1.1) with
  `params.time = currentTime`, `params.trackIds = null`; resulting
  `SceneState` has 2 elements where there was 1 (per affected track)
- `keyboard-delete-no-ripple` — `Delete` issues `delete` (spec 15
  §5.1.7) with `params.ripple = false`; selected elements removed,
  downstream elements unchanged
- `keyboard-backspace-ripple-delete` — `Backspace` issues `delete` with
  `params.ripple = true`; downstream elements shift left by deleted
  duration
- `keyboard-duplicate-cmd-d` — `Cmd+D` issues `duplicate` (spec 15
  §5.1.9) with `params.placement = { type: "alwaysNew", position:
  "highest" }`; new element appears on a fresh track with byte-identical
  `sourceStart`, `duration`, `mediaId`
- `keyboard-copy-cmd-c-then-paste-cmd-v` — `Cmd+C` captures `selection`
  to clipboard (no state change); subsequent `Cmd+V` issues `insert`
  (spec 15 §5.1.8) per clipboard entry at playhead; total element count
  grows by `selection.size`
- `keyboard-cut-cmd-x-is-copy-plus-ripple-delete` — `Cmd+X` produces
  the same `SceneState` as `Cmd+C` followed by `Backspace` (ripple
  delete of selection); clipboard populated, selection removed, gaps
  closed
- `keyboard-tab-selects-next-clip` — `Tab` advances selection to the
  element with the smallest `startTime` greater than the current
  selection's `startTime`; wraps to first element at end of timeline
- `keyboard-shift-tab-selects-previous-clip` — `Shift+Tab` walks
  selection backwards by `startTime`
- `keyboard-cmd-a-selects-all-on-track` — `Cmd+A` selects every element
  on the focused track; elements on other tracks unchanged
- `keyboard-cmd-shift-a-selects-all-in-timeline` — `Cmd+Shift+A`
  selects every element across every track in the scene
- `keyboard-escape-deselects` — `Esc` clears `selectedElementIds` and
  `selectedTrackIds` to empty sets
- `keyboard-up-down-select-adjacent-track-clip` — `Up` selects the
  clip at the same `startTime` on the track above; `Down` selects the
  track below; if no clip exists at that time, selects the nearest clip
  by `startTime`
- `keyboard-shift-up-down-add-to-selection` — `Shift+Up` / `Shift+Down`
  extend the current selection to include the adjacent-track clip
  (additive, not replacement)
- `keyboard-comma-period-nudge-1-frame` — `,` issues `move` (spec 15
  §5.1.3) with `params.delta = -frameDuration`; `.` issues `move` with
  `params.delta = +frameDuration`; selection shifts by exactly 1 frame
- `keyboard-shift-comma-period-nudge-10-frames` — `Shift+,` /
  `Shift+.` issue `move` with `params.delta = ±10 * frameDuration`
- `keyboard-bracket-trim-start-end-to-playhead` — `[` issues `trim`
  (spec 15 §5.1.2) with `params.edge = "start"`,
  `params.delta = currentTime - element.startTime`; `]` issues `trim`
  with `params.edge = "end"`,
  `params.delta = elementEndTime - currentTime`
- `keyboard-b-razor-mode-then-click-splits-at-click` — `B` switches
  the active tool to `'razor'`; subsequent `page.mouse.click()` at
  pixel `x` issues `split` with `params.time = pixelToTime(x)`,
  `params.trackIds = [hoveredTrackId]` (single track)
- `keyboard-v-switches-to-select-tool` — `V` sets active tool to
  `'select'`; subsequent click issues a `select` action (no
  `EngineCommand`, UI-only state change)
- `keyboard-h-switches-to-hand-tool` — `H` sets active tool to
  `'hand'`; subsequent drag pans the timeline viewport (no engine
  command, UI-only)
- `keyboard-z-switches-to-zoom-tool` — `Z` sets active tool to
  `'zoom'`; subsequent click-marquee zooms the dragged region (no
  engine command, UI-only state change)
- `keyboard-a-toggles-snap` — `A` flips
  `TimelineViewState.snapEnabled`; subsequent drag does not snap (verify
  via `move` state diff: dragged element lands at unmodified `pixelToTime(x)`)
- `keyboard-r-toggles-ripple-mode` — `R` flips
  `TimelineViewState.rippleMode`; subsequent `Delete` issues `delete`
  with `params.ripple = true` (regardless of `Backspace` vs `Delete`)
- `keyboard-m-adds-marker-at-playhead` — `M` issues `addMarker` with
  `params.time = currentTime`; `SceneState.markers` grows by 1
- `keyboard-plus-minus-zoom-in-out` — `+` multiplies `pixelsPerSecond`
  by `TIMELINE_ZOOM_BUTTON_FACTOR` (1.7); `-` divides by 1.7; both
  clamp to the min/max from §5.2 (1px/sec .. 100px/frame)
- `keyboard-cmd-0-reset-zoom` — `Cmd+0` resets `pixelsPerSecond` to
  default `50`; clip DOM widths return to baseline
- `keyboard-state-wysiwyg-for-every-shortcut` — parameterized test
  iterating the full shortcut table (spec 16 §3, §19.1): for each
  shortcut, run the keyboard path and the direct
  `engine.command.apply()` path from identical initial state; assert
  resulting `SceneState` deep-equal. This is the umbrella invariant —
  every shortcut above is also covered individually for clearer
  failure messages

### Property-based tests

[Filename: `tests/unit/05-timeline/<feature>.property.test.ts`]

- `virtualization-rendered-subset-of-visible-plus-buffer` — `fc.assert(
  fc.property(arbitrarySceneState, arbitraryViewport, arbitraryZoom,
  (s, v, z) => { const rendered = computeVisibleElements(s, v, z);
  const visible = computeStrictVisibleElements(s, v); const buffered =
  computeBufferedElements(s, v, z); assert(rendered.every(el =>
  buffered.includes(el))); assert(buffered.every(el => visible.includes(el)
  || isInBuffer(el, v, z))); }), { numRuns: 1000 })`
- `snap-points-have-no-duplicates` — for arbitrary scene state and
  viewport, `buildTimelineSnapPoints` produces an array where no two
  entries share the same `(time, type)` pair (dedup is the caller's
  responsibility per §9; the build step must not emit duplicates from
  the same source)
- `time-pixel-round-trip-within-1px` — for arbitrary `MediaTime` and
  arbitrary `pixelsPerSecond`, `Math.abs(timeToPixel(pixelToTime(p, pps),
  pps) - p) < 1` and `mediaTimeDiff(pixelToTime(timeToPixel(t, pps), pps),
  t) < pixelToTime(1, pps)` (round-trip error bounded by one pixel)

### Test assets

- `tests/fixtures/projects/100-clip-5-track.json` — 100 clips across
  5 tracks (20 per track, 5s each, sequential); used for the
  virtualization render test and the scroll-pruning test
- `tests/fixtures/projects/multi-track-blend.json` — 2-track project
  with red solid on main track + green solid on overlay track; used
  for the drag-drop test (verifies placement on the correct overlay
  track via `firstAvailable` strategy)
- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10s, 1080p;
  source for the main-track element in `multi-track-blend.json`
- `tests/fixtures/videos/10s-green-1080p.mp4` — solid green, 10s,
  1080p; source for the overlay element in `multi-track-blend.json`
- `tests/fixtures/videos/10s-blue-1080p.mp4` — solid blue, 10s, 1080p;
  source for the drag-drop from media library test
- `tests/fixtures/references/100-clip-zoom-1.7x.png` — reference PNG
  for the zoom-in Tier 2 pixel-diff; regenerated per spec 17 §10

### Test commands

```bash
# Run Tier 1 tests for this module
npm test -- --filter "05-timeline"

# Run Tier 2 (render) tests for this module
npm run test:render -- --filter "05-timeline"

# Run Tier 3 (UI) tests for this module
npm run test:ui -- --filter "05-timeline"

# Run all tiers for this module
npm run test:all -- --filter "05-timeline"

# Run property tests only
npm run test:property -- --filter "05-timeline"

# Regenerate reference PNGs for this module's fixtures (see §10)
npm run regen-references -- --filter "05-timeline"
```

---

**End of `05-timeline.md`.** Next: `06-nle-ops.md`; spec 18 (UI shell) consumes this spec's component contracts.

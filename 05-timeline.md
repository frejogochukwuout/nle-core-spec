# 05 — Timeline: UI, Data Model, Virtualization, Interactions

**Stream:** Timeline component (DOM-based, virtualized)
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** OpenCut-classic DOM approach + FreeCut's per-element NLE op UI
**Spec file:** `05-timeline.md`

---

## 1. Purpose

Define the timeline UI: how tracks and clips are rendered, how the user interacts with them (drag, trim, scrub), and how the UI stays responsive with hundreds of clips. This stream is mostly UI; the underlying NLE op logic is in `06-nle-ops.md`.

---

## 2. Goals

1. **Intuitive.** The user noted OpenCut-classic "feels more intuitive" — we adopt its DOM-based approach.
2. **Responsive.** 60fps UI with 500+ clips on the timeline.
3. **Virtualized.** Only render visible clips + a buffer; recycle DOM nodes.
4. **Accessible.** Keyboard navigation, screen reader labels.
5. **Decoupled from engine.** UI subscribes to `SceneManager` for state; calls `EditorCore.timeline.*` for commands.

---

## 3. Why DOM, Not Canvas

Both reference repos render the timeline, but differently:

| | FreeCut | OpenCut-classic |
|---|---|---|
| Tracks / clips | DOM (React) | DOM (React) |
| Ruler | Canvas | DOM |
| Filmstrip thumbnails | Canvas (tiled) | Canvas (wavesurfer.js, listed but unused) |
| Audio waveforms | Canvas | Canvas |
| Density mode | Hybrid DOM + canvas aggregator | None |

We adopt OpenCut-classic's approach: **DOM everywhere except where canvas is genuinely needed (filmstrip thumbnails, waveforms).** This matches the user's "intuitive" preference.

**Why DOM:**
- Easier to develop (DevTools, inspectable)
- Easier to make accessible (ARIA, keyboard nav)
- Easier to style (CSS, Tailwind)
- Fast enough for typical timelines (500 clips, virtualized)
- Browser handles hit-testing, scrolling, focus for free

**Why canvas for filmstrip/waveform:**
- Hundreds of small images per clip — DOM nodes would be expensive
- Pixel-dense rendering — canvas is more efficient
- Already produced as `ImageBitmap` / `Float32Array` from workers

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

**Reference:** OpenCut-classic `apps/web/src/timeline/components/index.tsx` (954 LOC, the `Timeline` function). Sub-agent scout to read in full.

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

- Min: 1 pixel per second (overview)
- Max: 100 pixels per frame (frame-accurate)
- Default: 50 pixels per second (rough cut zoom)

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

Use a library like `@tanstack/react-virtual` (both repos use it) for the heavy lifting. Or hand-roll a simple virtualizer.

**Reference:** OpenCut-classic uses `@tanstack/react-virtual`. Sub-agent to verify FreeCut's choice.

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

Implemented via the `useTimelineDrag` hook (adapted from FreeCut's `hooks/use-timeline-drag.ts`):

```ts
function useTimelineDrag() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  function startDrag(e: React.MouseEvent, elementIds: string[]) {
    const startX = e.clientX;
    const startTime = getSelectedStartTime();
    
    setDragState({ elementIds, startX, startTime, currentDelta: 0 });
    
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const deltaTime = pixelToTime(delta, pixelsPerSecond);
      
      // Snap
      const snappedTime = snapEnabled ? snap(startTime + deltaTime, snapPoints) : startTime + deltaTime;
      const snappedDelta = snappedTime - startTime;
      
      setDragState(prev => prev ? { ...prev, currentDelta: snappedDelta } : null);
    };
    
    const onUp = () => {
      if (dragState && dragState.currentDelta !== 0) {
        // Commit the move via EditorCore
        engine.timeline.move({ elementIds: dragState.elementIds, delta: dragState.currentDelta });
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
      // Commit via EditorCore
      engine.timeline.trim({ elementId, delta: preview.delta, edge });
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
  engine.timeline.split({ time, trackIds: [track.id] });
}
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
  engine.timeline.insert({ mediaId, trackId: targetTrack.id, time: targetTime });
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

**FreeCut reference:** `src/features/timeline/utils/timeline-snap-utils.ts`, `src/features/timeline/utils/razor-snap.ts`, `src/features/timeline/preview/components/snap-guides.tsx`. Sub-agent scout to read all three.

---

## 10. Track Headers

```tsx
function TrackHeader({ track }: Props) {
  return (
    <div className="track-header">
      <span className="track-name">{track.name}</span>
      <div className="track-controls">
        <button onClick={() => engine.timeline.toggleMute(track.id)}>M</button>
        <button onClick={() => engine.timeline.toggleSolo(track.id)}>S</button>
        <button onClick={() => engine.timeline.toggleLock(track.id)}>L</button>
        <button onClick={() => engine.timeline.toggleVisibility(track.id)}>V</button>
      </div>
    </div>
  );
}
```

For audio tracks: M/S/L (no V). For video tracks: M/V/L (no S, or S if we support solo-video). For text/overlay tracks: M/V/L.

---

## 11. Markers & In/Out Points

### 11.1 Markers

User can place markers (with optional labels) at any time:

```ts
interface Marker {
  id: string;
  time: MediaTime;
  label?: string;
  color?: string;
}
```

Stored on the project (not per-scene). Click on ruler to add marker.

### 11.2 In/Out points

For range playback and export range:

```ts
interface InOutPoints {
  in: MediaTime | null;
  out: MediaTime | null;
}
```

Press `I` to set in, `O` to set out, `G` to clear.

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
- Use `IntersectionObserver` for virtualization triggers (not scroll events)
- Use `ResizeObserver` for layout changes

---

## 14. Open Questions for Sub-Agent Scout

1. **OpenCut-classic `timeline/components/index.tsx`.** Read in full (954 LOC). Document:
   - Component hierarchy
   - State management
   - Render strategy
   - How it integrates with `useEditor()` hook

2. **OpenCut-classic `timeline/components/timeline-track.tsx`, `timeline-element.tsx`.** Read both. Document the track and clip rendering, including the `IntersectionObserver` virtualization.

3. **OpenCut-classic `timeline/components/timeline-ruler.tsx`, `timeline-playhead.tsx`.** Read both. Document the ruler rendering (DOM-based) and playhead drag.

4. **OpenCut-classic `timeline/controllers/`.** Read all controllers (`drag-drop.ts`, `resize.ts`, `seek.ts`, `playhead.ts`, `zoom.ts`, `keyframe-drag.ts`, `element-interaction.ts`). Document the controller pattern — this is the architectural separator between interaction logic and rendering.

5. **OpenCut-classic `timeline/placement/`.** Read `resolve.ts`, `overlap.ts`, `compatibility.ts`, `insert-index.ts`. Document the placement algorithm — when dragging, how is the target position computed and how are overlaps resolved?

6. **OpenCut-classic `timeline/snapping/`.** Read all files. Document the snap point computation.

7. **OpenCut-classic `timeline/types.ts` and `project/types.ts`.** Read both. Document the `TScene`, `SceneTracks`, `TimelineElement`, `Track` types.

8. **OpenCut-classic `hooks/use-timeline-drag.ts`, `use-timeline-resize.ts`.** Read both. Document the drag/resize hook pattern.

9. **FreeCut `features/timeline/components/timeline.tsx` and `timeline-content.tsx`.** Read both (~3,300 LOC combined). Document:
   - How FreeCut structures the timeline differently from OpenCut-classic
   - The "dense timeline" density-overview mode
   - The marquee implementation
   - The drop zones implementation

10. **FreeCut `features/timeline/components/timeline-item/`.** List and read all 50+ files in this directory. Document:
    - `clip-content.tsx` — main clip renderer
    - `trim-handles.tsx` — trim handles
    - `stretch-handles.tsx` — rate-stretch handles
    - `audio-fade-handles.tsx` — audio fade handles
    - `tool-operation-overlay.tsx` — overlay during tool operations
    - `drag-ghosts.tsx` — drag preview ghosts

11. **FreeCut `features/timeline/hooks/`.** Read `use-timeline-drag.ts`, `use-timeline-resize.ts`, `use-rate-stretch.ts`, `use-timeline-slip-slide.ts`. Document the hook pattern and what each hook does.

12. **FreeCut `features/timeline/utils/timeline-snap-utils.ts`, `razor-snap.ts`.** Read both. Document the snap point computation and razor-specific snap behavior.

13. **FreeCut `features/timeline/components/timeline-ruler-viewport-canvas.tsx`.** Read in full. Why canvas for the ruler? (We're considering DOM for our ruler.)

14. **OpenCut-classic `apps/web/src/components/editor/panels/`.** Read the editor panel layout (`ResizablePanelGroup` setup). Document how the timeline panel fits with preview and library panels.

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

**End of `05-timeline.md`.** Next: `06-nle-ops.md`.

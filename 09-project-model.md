# 09 — Project Model: Schema, Persistence, Migrations (Refined)

**Stream:** Project data model & persistence
**Status:** Refined by sub-agent scout (SCOUT-09) — open questions answered with source code references
**Primary teacher:** OpenCut-classic types + our own storage layer (override OpenCut's IndexedDB)
**Spec file:** `09-project-model.md` (single canon file — renamed from `.refined.md` in R9 per 00-master §2.5; seed text recoverable in git history)

---

## 0. Refined-Spec Notes (new section by scout)

This file extends the seed `09-project-model.md`. Sections 1–7 are re-stated verbatim with light inline annotations. Section 8 (Open Questions) is fully rewritten with concrete source-code answers. Sections 9–13 are new:
- **§10 Code References** — every file read by the scout, with one-line summary.
- **§11 Corrections to Seed Spec** — assumptions in the seed that the source code contradicts.
- **§12 OpenCut-classic Migration Summary** — table of all 31 migrations.
- **§13 kimdogyeom Bug Hardening Checklist** — for each of the three OpenCut persistence bugs (#870, #871, #873), the exact code pattern in OpenCut-classic that causes it and the corresponding pattern in our spec that prevents it.

Repository line counts reported below are accurate as of the cloned tip (`/tmp/opencut-classic` and `/tmp/freecut`).

---

## 1. Purpose

Define the project data model: the schema, the JSON serialization format, and the persistence layer (OPFS). This stream overrides both reference repos — we use our own storage, not OpenCut-classic's IndexedDB-with-31-migrations or FreeCut's File System Access API.

---

## 2. Goals

1. **Pure JSON.** Project state is a JSON-serializable object. No `FileSystemDirectoryHandle`, no class instances, no functions.
2. **Schema-versioned.** `version: 1` with clear migration path to v2, v3, etc.
3. **Storage-agnostic.** Engine consumes JSON; storage layer (OPFS, server, whatever) is swappable.
4. **Replace OpenCut-classic's 31 migrations.** Start at v1, design for forward-compatibility.
5. **No silent data loss.** Persistence failures bubble up; never claim success on failure (the kimdogyeom bugs #870, #871, #873 in OpenCut-classic).
6. **WYSIWYG contract.** Same project JSON → same render output, anywhere.

---

## 3. The Schema

### 3.1 Project JSON

```ts
// src/engine/types/project.ts

interface ProjectJSON {
  schemaVersion: 1;

  metadata: ProjectMetadata;
  settings: ProjectSettings;
  scenes: SceneJSON[];
  currentSceneId: string;

  media: MediaRecord[];          // media library (per-project)
  markers: Marker[];

  // UI prefs (optional — not part of WYSIWYG contract)
  uiState?: ProjectUIState;
}

interface ProjectMetadata {
  id: string;                    // UUID v4
  name: string;
  description?: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;
  thumbnailId?: string;          // mediaId of a thumbnail
  duration: MediaTime;            // total duration
}

interface ProjectSettings {
  fps: FrameRate;
  canvasSize: { width: number; height: number };
  backgroundColor: ColorRGBA;     // linear-light, 0-1
  displayMode: DisplayMode;
  audioSampleRate: number;         // e.g., 48000
  audioChannels: number;           // 2 for stereo
}

interface DisplayMode {
  primaries: 'bt709' | 'bt2020' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg';
  toneMap: 'none' | 'reinhard' | 'aces-filmic';  // for HDR → SDR
}

interface SceneJSON {
  id: string;
  name: string;
  isMain: boolean;

  tracks: SceneTracksJSON;
  bookmarks: Bookmark[];
}

interface SceneTracksJSON {
  overlay: OverlayTrackJSON[];
  main: VideoTrackJSON;
  audio: AudioTrackJSON[];
}

interface TrackJSON {
  id: string;
  name: string;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  volume: number;
  elements: string[];            // element IDs in time order
}

interface VideoTrackJSON extends TrackJSON {}
interface OverlayTrackJSON extends TrackJSON {}
interface AudioTrackJSON extends TrackJSON {
  audioEq?: AudioEq;
}

interface ElementJSON {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'shape' | 'adjustment';
  trackId: string;

  // Timeline position
  startTime: MediaTime;
  duration: MediaTime;

  // Source position
  sourceStart: MediaTime;
  sourceDuration: MediaTime;
  mediaId?: string;              // for video/audio/image

  // Retime
  speed: number;                 // 1.0 = normal, 2.0 = 2x, -1.0 = reverse

  // Audio
  volume: number;
  muted: boolean;
  audioFadeIn?: MediaTime;
  audioFadeOut?: MediaTime;

  // Visual
  opacity: number;
  visible: boolean;
  transform?: TransformJSON;

  // Effects
  effects: EffectJSON[];
  masks: MaskJSON[];

  // Transitions
  transitionIn?: TransitionJSON;
  transitionOut?: TransitionJSON;

  // Name
  name: string;
  color?: string;
}

interface TransformJSON {
  centerX: number;
  centerY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;              // degrees
  flipX: boolean;
  flipY: boolean;
  anchor?: { x: number; y: number };
  // Animation
  keyframes?: KeyframeTrackJSON[];
}

interface EffectJSON {
  id: string;
  type: string;                   // 'color-wheels' | 'curves' | 'lut' | ...
  enabled: boolean;
  params: Record<string, number | number[] | string | boolean>;
  keyframes?: KeyframeTrackJSON[];
}

interface MaskJSON {
  id: string;
  type: 'shape' | 'image' | 'qualifier';
  enabled: boolean;
  shape?: 'rectangle' | 'ellipse' | 'polygon';
  shapeParams?: ShapeParamsJSON;
  mediaId?: string;
  qualifierParams?: QualifierParamsJSON;
  feather: number;
  inverted: boolean;
  opacity: number;
}

interface TransitionJSON {
  id: string;
  type: 'crossfade';                    // structural only — spec 07 §6.1A (Round-7 amendment)
  presentation: string;                 // registry key ('fade' | 'wipe-left' | ...)
  duration: MediaTime;
  alignment: number;                    // 0..1, default 0.5 — cut-centered window
  timing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  leftElementId: string;                // (was elementAId)
  rightElementId: string;               // (was elementBId)
}

interface MediaRecord {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  size: number;
  duration: MediaTime;            // for video/audio
  width?: number;                 // for video/image
  height?: number;
  fps?: FrameRate;
  colorInfo: MediaColorInfo;
  // Storage reference (where the actual file lives)
  storage: MediaStorageRef;
  // Thumbnail
  thumbnailId?: string;
}

interface MediaColorInfo {
  primaries: 'bt709' | 'bt2020' | 'smpte-c' | 'display-p3';
  transfer: 'srgb' | 'pq' | 'hlg' | 'bt709';
  matrix: 'bt709' | 'bt2020-ncl' | 'bt601';
  range: 'limited' | 'full';
}

interface MediaStorageRef {
  type: 'opfs' | 'remote';
  path: string;                  // e.g., 'media/{mediaId}.mp4'
  // For remote: includes URL or signed URL
}

interface Marker {
  id: string;
  time: MediaTime;
  label?: string;
  color?: string;
}

interface Bookmark {
  id: string;
  time: MediaTime;
  label: string;
}

interface ColorRGBA {
  r: number; g: number; b: number; a: number;
}

interface ProjectUIState {
  timelineView?: TimelineViewState;
  selectedElementIds?: string[];
  // ... (UI prefs, not part of WYSIWYG)
}

```

> The full `ProjectUIState` field inventory (workspace/panel layout, inspector state, timeline view) is owned by `18-ui-shell.md`; this spec persists it opaquely and MUST NOT gate WYSIWYG correctness on it (§2 Goal 6).

```ts
interface TimelineViewState {
  pixelsPerSecond: number;
  scrollLeft: number;
  scrollTop: number;
  rippleMode: boolean;
  snapEnabled: boolean;
}

interface KeyframeTrackJSON {
  property: string;              // 'transform.centerX' | 'volume' | ...
  keyframes: KeyframeJSON[];
}

interface KeyframeJSON {
  time: MediaTime;
  value: number | string | boolean | object;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  easingParams?: { cx1: number; cy1: number; cx2: number; cy2: number };  // for bezier
}
```

### 3.2 MediaTime and FrameRate serialization

In JSON, `MediaTime` (which is a branded `number`) serializes as a plain number. `FrameRate` (rational) serializes as `{numerator, denominator}`. The schema is straightforward — no special handling needed.

```ts
// Serialize: just JSON.stringify — branded types serialize as their underlying type
const json = JSON.stringify(project);

// Deserialize: parse + validate
const parsed = JSON.parse(json);
const project = ProjectSchema.parse(parsed);  // Zod validation
```

### 3.3 Schema validation with Zod

```ts
// src/engine/types/project-schema.ts

import { z } from 'zod';

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  metadata: ProjectMetadataSchema,
  settings: ProjectSettingsSchema,
  scenes: z.array(SceneSchema),
  currentSceneId: z.string().uuid(),
  media: z.array(MediaRecordSchema),
  markers: z.array(MarkerSchema),
  uiState: ProjectUIStateSchema.optional(),
});

export const ProjectMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  thumbnailId: z.string().optional(),
  duration: z.number().int(),  // MediaTime = number
});

// ... etc for all types

// Type inference
export type ProjectJSON = z.infer<typeof ProjectSchema>;
```

---

## 4. Persistence Layer

### 4.1 OPFS (Origin Private File System)

The browser's OPFS gives us a private file system for the app. Files are stored on disk (not in IndexedDB), with synchronous-ish access (via workers) and good performance for large files.

```ts
// src/platform/storage/OPFSStorage.ts

class OPFSStorage implements Storage {
  private root: FileSystemDirectoryHandle;

  async initialize(): Promise<void> {
    this.root = await navigator.storage.getDirectory();
    // Ensure subdirectories exist
    await this.ensureDir('projects');
    await this.ensureDir('media');
    await this.ensureDir('thumbnails');
  }

  async loadProject(id: string): Promise<ProjectJSON | null> {
    try {
      const dir = await this.root.getDirectoryHandle('projects');
      const fileHandle = await dir.getFileHandle(`${id}.json`);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      return parsed as ProjectJSON;  // raw JSON — validation + migration happen at the ProjectManager layer (§5.1: migrateProject → ProjectSchema.parse; a z.literal(N) parse here would reject pre-migration projects)
    } catch (e) {
      if (e.name === 'NotFoundError') return null;
      throw e;
    }
  }

  async saveProject(id: string, data: ProjectJSON): Promise<void> {
    const dir = await this.root.getDirectoryHandle('projects', { create: true });
    const fileHandle = await dir.getFileHandle(`${id}.json`, { create: true });

    // Atomic write: write to temp, then rename
    const tempHandle = await dir.getFileHandle(`${id}.json.tmp`, { create: true });
    const writable = await tempHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    // Atomic rename (OPFS supports this via move)
    await tempHandle.move(`${id}.json`);
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    const dir = await this.root.getDirectoryHandle('projects');
    const projects: ProjectMetadata[] = [];
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        const id = name.replace('.json', '');
        const project = await this.loadProject(id);
        if (project) projects.push(project.metadata);
      }
    }
    return projects;
  }

  async deleteProject(id: string): Promise<void> {
    const dir = await this.root.getDirectoryHandle('projects');
    await dir.removeEntry(`${id}.json`);
    // Also delete associated media
    await this.deleteProjectMedia(id);
  }

  async loadMedia(mediaId: string): Promise<Blob | null> {
    try {
      const dir = await this.root.getDirectoryHandle('media');
      const fileHandle = await dir.getFileHandle(mediaId);
      return await fileHandle.getFile();
    } catch (e) {
      if (e.name === 'NotFoundError') return null;
      throw e;
    }
  }

  async saveMedia(mediaId: string, blob: Blob): Promise<void> {
    const dir = await this.root.getDirectoryHandle('media', { create: true });
    const fileHandle = await dir.getFileHandle(mediaId, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async deleteMedia(mediaId: string): Promise<void> {
    const dir = await this.root.getDirectoryHandle('media');
    try {
      await dir.removeEntry(mediaId);
    } catch (e) {
      if (e.name === 'NotFoundError') return;
      throw e;
    }
  }

  private async ensureDir(name: string): Promise<void> {
    try {
      await this.root.getDirectoryHandle(name);
    } catch {
      await this.root.getDirectoryHandle(name, { create: true });
    }
  }
}
```

### 4.2 Worker-based OPFS access (performance)

For large media files, OPFS access should happen in the `opfs.worker.ts` (see `02-workers-threading.md` §8.6). This avoids blocking the main thread during file I/O.

```ts
// Main thread calls worker
async saveMedia(mediaId: string, blob: Blob): Promise<void> {
  await this.opfsWorker.postMessage({ type: 'write', path: `media/${mediaId}`, data: await blob.arrayBuffer() });
}
```

### 4.3 Why OPFS, not IndexedDB or FS-Access API

| | IndexedDB | FS-Access API | OPFS |
|---|---|---|---|
| Browser support | All modern | Chromium only | Chromium 86+, Firefox 111+, Safari 16.4+ |
| Performance | Decent (slow for large blobs) | Fast (direct file access) | Fast (worker-accessible) |
| Persistence | Yes (until cleared) | Yes (until file deleted) | Yes (origin-scoped) |
| User friction | None | Permission prompts | None |
| File system metaphor | No (key-value store) | Yes (full FS access) | Yes (private FS) |
| Handle persistence | ❌ (must re-acquire) | ✅ (via IndexedDB registry) | ✅ (origin-scoped, automatic) |

OpenCut-classic uses IndexedDB → has 31 schema migrations → bug-prone (kimdogyeom #871). FreeCut uses FS-Access API + IndexedDB handle registry → complex (strips handles on write, re-attaches on read). **OPFS is simpler, faster, and avoids both these problems.**

### 4.4 File layout in OPFS

```
opfs://
├── projects/
│   ├── {project-id-1}.json
│   ├── {project-id-2}.json
│   └── ...
├── media/
│   ├── {media-id-1}.mp4
│   ├── {media-id-2}.mov
│   └── ...
├── thumbnails/
│   ├── {media-id-1}-thumb.jpg
│   └── ...
├── proxies/                       (optional, for proxy workflows)
│   ├── {media-id-1}-proxy.mp4
│   └── ...
└── cache/                          (transient)
    ├── filmstrip-{media-id}-{time}.png
    ├── waveform-{media-id}.bin
    └── ...
```

---

## 5. Migrations

### 5.1 The migration framework

```ts
// src/engine/types/migrations.ts

interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate(project: any): any;  // takes any, returns migrated project
}

const migrations: Migration[] = [
  // Example future migration:
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   migrate: (p) => {
  //     // Add new field with default
  //     return { ...p, schemaVersion: 2, newField: 'default' };
  //   }
  // },
];

export function migrateProject(project: any): ProjectJSON {
  let current = project;
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations.find(m => m.fromVersion === current.schemaVersion);
    if (!migration) {
      throw new Error(`No migration from version ${current.schemaVersion}`);
    }
    current = migration.migrate(current);
  }
  return ProjectSchema.parse(current);  // Final validation
}

export const CURRENT_SCHEMA_VERSION = 1;
```

### 5.2 Migration rules

1. **Always forward-only.** Never support down-migration (down is just "load an older backup").
2. **Always validate at the end.** `ProjectSchema.parse()` after all migrations.
3. **Never silently fail.** Migration errors propagate.
4. **Backup before migration.** Save a copy as `{id}.json.v{oldVersion}.bak`.

### 5.3 Avoiding OpenCut-classic's migration bugs

The kimdogyeom bugs (#871 specifically) showed OpenCut-classic caches a failed migration promise permanently. We avoid this by:

```ts
class ProjectManager {
  private migrationPromise: Promise<void> | null = null;

  async ensureMigrations(): Promise<void> {
    if (this.migrationPromise) {
      try {
        await this.migrationPromise;
      } catch (e) {
        // Clear the cached promise on failure (unlike OpenCut-classic #871)
        this.migrationPromise = null;
        throw e;
      }
      return;
    }

    this.migrationPromise = this.runMigrations();
    try {
      await this.migrationPromise;
    } finally {
      // Always clear after completion (success or failure)
      this.migrationPromise = null;
    }
  }

  private async runMigrations(): Promise<void> {
    // ...
  }
}
```

---

## 6. Autosave Strategy

### 6.1 Debounced autosave

```ts
class ProjectManager {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private isSaving: boolean = false;
  private pendingSave: boolean = false;

  scheduleAutosave(delay: number = 2000): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), delay);
  }

  async save(): Promise<void> {
    // If a save is in flight, queue another one
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }

    this.isSaving = true;
    try {
      const project = this.serializeCurrentState();
      await this.storage.saveProject(project.metadata.id, project);
    } finally {
      this.isSaving = false;
      if (this.pendingSave) {
        this.pendingSave = false;
        // Save again with the latest state
        await this.save();
      }
    }
  }

  private serializeCurrentState(): ProjectJSON {
    // Get current state from SceneManager
    // ...
  }
}
```

### 6.2 Avoiding OpenCut-classic's race bugs

The kimdogyeom bugs (#870, #873) showed:
- Concurrent autosaves can lose newer changes
- Rename/delete races can lose data

We avoid these by:

1. **Single save queue.** No concurrent saves — always serialized.
2. **Per-project lock.** Only one operation (save/rename/delete) at a time per project.
3. **Errors propagate.** `save()` rejects on failure; UI shows error.

```ts
class ProjectManager {
  private projectLocks: Map<string, Promise<unknown>> = new Map();

  async withProjectLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.projectLocks.get(projectId) ?? Promise.resolve();
    const next = existing.then(fn, fn);  // run even if previous failed
    this.projectLocks.set(projectId, next);
    try {
      return await next;
    } finally {
      if (this.projectLocks.get(projectId) === next) {
        this.projectLocks.delete(projectId);
      }
    }
  }

  async save(): Promise<void> {
    return this.withProjectLock(this.currentProjectId, async () => {
      // ... actual save logic
    });
  }

  async renameProject(newName: string): Promise<void> {
    return this.withProjectLock(this.currentProjectId, async () => {
      // Wait for any pending save to complete
      // Then rename
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.withProjectLock(id, async () => {
      // Cancel any pending save
      // Delete project file and media
    });
  }
}
```

### 6.3 Visibility / unload handling

When the user leaves or closes the tab:

```ts
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Force-save before backgrounding
    navigator.locks.request('project-save', async () => {
      await this.save();
    });
  }
});

window.addEventListener('beforeunload', (e) => {
  if (this.isDirty) {
    e.preventDefault();
    e.returnValue = '';
    // Attempt synchronous save (may not complete in time)
    // ...
  }
});
```

---

## 7. Media Library

### 7.1 Import flow

```
1. User selects files via <input type="file">
2. For each file:
   a. Copy to OPFS: storage.saveMedia(mediaId, file)
   b. Extract metadata (mediabunny worker): duration, fps, width, height, codec, color info
   c. Generate thumbnail (media-processor worker): decode frame at 1s, save as JPG
   d. Add MediaRecord to project.media
3. Save project
4. UI updates
```

### 7.2 MediaRecord (in project JSON)

```ts
interface MediaRecord {
  id: string;                    // UUID v4
  name: string;                  // original filename
  type: 'video' | 'audio' | 'image';
  size: number;                  // bytes
  duration: MediaTime;
  width?: number;
  height?: number;
  fps?: FrameRate;
  colorInfo: MediaColorInfo;
  storage: MediaStorageRef;
  thumbnailId?: string;
}
```

### 7.3 Media deletion

When media is deleted:
1. Remove from project.media
2. Remove all elements referencing it from the timeline
3. Delete the file from OPFS
4. Save project

Step 3 should happen in the `opfs.worker.ts` to avoid blocking.

### 7.4 Thumbnail generation

```ts
async function generateThumbnail(mediaId: string, atTime: MediaTime = mediaTimeFromSeconds({ seconds: 1 })): Promise<string> {
  // Use media-processor worker
  const thumbnail = await mediaProcessorWorker.postMessage({
    type: 'extract-thumbnail',
    source: await storage.loadMedia(mediaId),
    time: atTime,
    size: { width: 320, height: 180 },
  });

  // Save to OPFS
  const thumbnailId = `thumb-${mediaId}`;
  await storage.saveMedia(thumbnailId, await thumbnail.toBlob('image/jpeg', 0.8));

  return thumbnailId;
}
```

---

## 8. Open Questions — ANSWERED by scout

> The seed spec listed 12 open questions. The scout has answered each below with file:line evidence from OpenCut-classic (`/tmp/opencut-classic`) and FreeCut (`/tmp/freecut`).

### 8.1 OpenCut-classic `apps/web/src/project/types.ts` — full quote and adoption

The seed asked: *"Read in full. Document the `TProject`, `TScene`, `SceneTracks`, element types. We adopt most of this with modifications (10-bit color, our own persistence)."*

**File:** `/tmp/opencut-classic/apps/web/src/project/types.ts` (55 LOC, quoted in full):

```ts
import type { FrameRate } from "opencut-wasm";
import type { TScene } from "@/timeline/types";
import type { MediaTime } from "@/wasm";

export type TBackground =
        | { type: "color"; color: string; }
        | { type: "blur"; blurIntensity: number; };

export interface TCanvasSize { width: number; height: number; }

export interface TProjectMetadata {
        id: string;
        name: string;
        thumbnail?: string;
        duration: MediaTime;
        createdAt: Date;
        updatedAt: Date;
}

export interface TProjectSettings {
        fps: FrameRate;
        canvasSize: TCanvasSize;
        canvasSizeMode?: "preset" | "custom";
        lastCustomCanvasSize?: TCanvasSize | null;
        originalCanvasSize?: TCanvasSize | null;
        background: TBackground;
}

export interface TTimelineViewState {
        zoomLevel: number;
        scrollLeft: number;
        playheadTime: MediaTime;
}

export interface TProject {
        metadata: TProjectMetadata;
        scenes: TScene[];
        currentSceneId: string;
        settings: TProjectSettings;
        version: number;
        timelineViewState?: TTimelineViewState;
}

export type TProjectSortKey = "createdAt" | "updatedAt" | "name" | "duration";
export type TSortOrder = "asc" | "desc";
export type TProjectSortOption = `${TProjectSortKey}-${TSortOrder}`;
```

**Key observations:**

1. `TProject` (lines 44–51) is structurally identical to our `ProjectJSON` except: (a) `MediaTime` is imported from `@/wasm` (a branded Rust-i64 wrapper), whereas we use a TS-branded number; (b) `createdAt`/`updatedAt` are JS `Date` instances on the in-memory type but serialized to ISO strings via `SerializedProject` in `apps/web/src/services/storage/types.ts:37-43`; (c) `version: number` is untyped (line 49) where ours is `schemaVersion: 1` (Zod literal). **Adoption decision:** keep our `schemaVersion: z.literal(1)` (typed) over their `version: number` (untyped) — the literal prevents accidentally bumping version without writing a migration.

2. `TProjectSettings.background` (lines 5–13) is a discriminated union (`color | blur`). Our seed spec simplified this to `backgroundColor: ColorRGBA`. **Correction:** We should keep the discriminated-union form to support blur-backdrop — see **§11 Correction #1**.

3. `TScene` and `SceneTracks` are not in `project/types.ts`; they live in `apps/web/src/timeline/types.ts:19-80` (quoted in §8.2 below). The full scene graph splits the same way our spec does.

4. `TProjectMetadata.thumbnail` is `string` (line 23) — a base64 data URL in OpenCut-classic (see `project-manager.ts:682` `tempCanvas.toDataURL('image/png')`). Our seed spec uses `thumbnailId?: string` referencing a separate media file. **Adoption decision:** keep `thumbnailId` — base64 data URLs bloat the JSON and re-encode on every save.

**Files of relevance (full inventory):**

- `apps/web/src/project/types.ts` (55 LOC) — `TProject`, `TProjectMetadata`, `TProjectSettings`, `TBackground`, `TCanvasSize`, `TTimelineViewState`, sort types. Quoted in full above.
- `apps/web/src/timeline/types.ts` (287 LOC) — `TScene`, `SceneTracks`, `VideoTrack`, `TextTrack`, `AudioTrack`, `GraphicTrack`, `EffectTrack`, `BaseTimelineElement`, all `*Element` types, `CreateTimelineElement`, `ElementDragState`, `DropTarget`. See §8.2 below.

### 8.2 OpenCut-classic `apps/web/src/timeline/types.ts` — full structural quote

**File:** `/tmp/opencut-classic/apps/web/src/timeline/types.ts` (287 LOC). Key types:

```ts
// Lines 19-27
export interface TScene {
        id: string;
        name: string;
        isMain: boolean;
        tracks: SceneTracks;
        bookmarks: Bookmark[];
        createdAt: Date;
        updatedAt: Date;
}

// Lines 29-80
export type TrackType = "video" | "text" | "audio" | "graphic" | "effect";
interface BaseTrack { id: string; name: string; }

export interface VideoTrack extends BaseTrack {
        type: "video";
        elements: (VideoElement | ImageElement)[];
        muted: boolean;
        hidden: boolean;
}
export interface TextTrack extends BaseTrack {
        type: "text";
        elements: TextElement[];
        hidden: boolean;
}
export interface AudioTrack extends BaseTrack {
        type: "audio";
        elements: AudioElement[];
        muted: boolean;
}
export interface GraphicTrack extends BaseTrack {
        type: "graphic";
        elements: (StickerElement | GraphicElement)[];
        hidden: boolean;
}
export interface EffectTrack extends BaseTrack {
        type: "effect";
        elements: EffectElement[];
        hidden: boolean;
}

export type TimelineTrack =
        | VideoTrack | TextTrack | AudioTrack | GraphicTrack | EffectTrack;
export type OverlayTrack = VideoTrack | TextTrack | GraphicTrack | EffectTrack;

export interface SceneTracks {
        overlay: OverlayTrack[];
        main: VideoTrack;
        audio: AudioTrack[];
}
```

**Critical structure to adopt verbatim:** `SceneTracks` (lines 76–80) is a type-enforced singleton `main` (not an array). The seed spec's `SceneTracksJSON` (§3.1) preserves this — `main: VideoTrackJSON` not `main: VideoTrackJSON[]`. This is exactly what the master spec (Decision 2) calls out.

**OpenCut-classic has 7 element types** (lines 166–173):
```ts
export type TimelineElement =
        | AudioElement | VideoElement | ImageElement
        | TextElement | StickerElement | GraphicElement | EffectElement;
```

Our seed spec defines 6 element types (`'video' | 'audio' | 'text' | 'image' | 'shape' | 'adjustment'`). **Differences:**
- We collapse `sticker` + `graphic` → `shape` (no UX distinction at v1).
- We rename `effect` → `adjustment` (industry-standard term).
- We omit `LibraryAudioElement` (FreeCut-style external URL audio) — out of scope for v1.

**Adoption decision:** Stick with 6 element types. Use Zod discriminated unions (see §8.10) for type-safe parsing.

### 8.3 OpenCut-classic `apps/web/src/services/storage/` — full file inventory

The seed asked: *"Read all files (IndexedDB adapter, OPFS adapter, migrations). Document the 31 migration versions, the `storageService` interface, the `IndexedDBAdapter` and `OPFSAdapter` implementations."*

**File inventory (`/tmp/opencut-classic/apps/web/src/services/storage/`):**

| File | LOC | Purpose |
|---|---|---|
| `types.ts` | 66 | `StorageAdapter<T>` interface, `SerializedProject`, `MediaAssetData`, `StorageConfig`, global augmentation for `FileSystemDirectoryHandle` async iterators. |
| `indexeddb-adapter.ts` | 127 | `IndexedDBAdapter<T>` class implementing `StorageAdapter<T>`: `get`/`set`/`remove`/`list`/`getAll`/`clear` over a single object store, key path `'id'`. `deleteDatabase()` helper. |
| `opfs-adapter.ts` | 79 | `OPFSAdapter` class implementing `StorageAdapter<File>` for media blobs. Uses `navigator.storage.getDirectory()` + `getDirectoryHandle(name, { create: true })`. Static `isSupported()` checks `'storage' in navigator && 'getDirectory' in navigator.storage`. **This is what we adopt for our `OPFSStorage`** — but OpenCut-classic uses it only for media, not project JSON. |
| `service.ts` | 575 | `StorageService` singleton class. Holds a `projectsAdapter: IndexedDBAdapter<SerializedProject>` and `savedSoundsAdapter`. Per-project media adapters via `getProjectMediaAdapters({ projectId })`. **Contains the `ensureMigrations()` bug from kimdogyeom #871** (lines 81–91, quoted below). |
| `quota.ts` | 147 | `StorageQuotaExceededError`, `readStorageQuotaStatus()`, `evaluateStorageCapacity()`. Used by `saveMediaAsset()` to pre-check capacity. |
| `use-storage-persistence.ts` | 45 | React hook for storage persistence UI dialog. |
| `use-local-storage.ts` | 58 | React hook wrapping `localStorage` for UI prefs. |
| `components/storage-persistence-dialog.tsx` | — | UI for storage quota. |
| `migrations/` (38 files) | 2024 | 31 version-stepping migration wrappers + `base.ts`, `index.ts`, `runner.ts`, AGENTS.md, and `__tests__/` directory. See §8.4. |

**The `StorageService` interface (key methods):**

```ts
// From /tmp/opencut-classic/apps/web/src/services/storage/service.ts:54-79
class StorageService {
  private projectsAdapter: IndexedDBAdapter<SerializedProject>;
  private savedSoundsAdapter: IndexedDBAdapter<SavedSoundsData>;
  private config: StorageConfig;
  private migrationsPromise: Promise<void> | null = null;

  // Public API (selected):
  async canStoreFile({ size }): Promise<StorageCapacityCheckResult>;
  isQuotaExceededError({ error }): boolean;

  async saveProject({ project: TProject }): Promise<void>;             // line 134
  async loadProject({ id }): Promise<{ project: TProject } | null>;    // line 170
  async loadAllProjects(): Promise<TProject[]>;                        // line 227
  async loadAllProjectsMetadata(): Promise<TProjectMetadata[]>;        // line 243
  async deleteProject({ id }): Promise<void>;                          // line 283

  async saveMediaAsset({ projectId, mediaAsset }): Promise<void>;     // line 287
  async loadMediaAsset({ projectId, id }): Promise<MediaAsset | null>; // line 336
  async loadAllMediaAssets({ projectId }): Promise<MediaAsset[]>;      // line 384
  async deleteMediaAsset({ projectId, id }): Promise<void>;             // line 406
  async deleteProjectMedia({ projectId }): Promise<void>;              // line 422
  async clearAllData(): Promise<void>;                                  // line 436

  async getStorageInfo(): Promise<{ projects; isOPFSSupported; isIndexedDBSupported }>;
  async getProjectStorageInfo({ projectId }): Promise<{ mediaItems }>;

  isOPFSSupported(): boolean;        // line 561
  isIndexedDBSupported(): boolean;   // line 565
  isFullySupported(): boolean;       // line 569
}
export const storageService = new StorageService();
```

**The `ensureMigrations()` poison-cache bug** (this is bug #871 — see §13):

```ts
// /tmp/opencut-classic/apps/web/src/services/storage/service.ts:81-91
private async ensureMigrations(): Promise<void> {
  if (this.migrationsPromise) {            // <-- if promise already exists, just await it
    await this.migrationsPromise;           // <-- BUG: a rejected promise is cached permanently
    return;                                //     Subsequent callers re-await the same rejection.
  }
  this.migrationsPromise = runStorageMigrations({ migrations }).then(
    () => undefined,
  );
  await this.migrationsPromise;
}
```

**The `IndexedDBAdapter` implementation (full):**

```ts
// /tmp/opencut-classic/apps/web/src/services/storage/indexeddb-adapter.ts:3-115
export class IndexedDBAdapter<T> implements StorageAdapter<T> {
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor({ dbName, storeName, version = 1 }) { /* assigns */ }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  async get(key) {
    const db = await this.getDB();
    const tx = db.transaction([this.storeName], "readonly");
    const store = tx.objectStore(this.storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || null);
    });
  }

  async set({ key, value }) {
    const db = await this.getDB();
    const tx = db.transaction([this.storeName], "readwrite");
    const store = tx.objectStore(this.storeName);
    return new Promise((resolve, reject) => {
      const req = store.put({ id: key, ...value });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }
  // ... remove, list, getAll, clear follow same IDB pattern
}
```

**The `OPFSAdapter` (full, 79 LOC):** see seed spec §4.1 above. Key points:

1. Constructor takes a single `directoryName` (default `'media'`) — used as the OPFS subdirectory. Each project's media lives in its own subdir (`media-files-${projectId}`, see `service.ts:100`).
2. `getDirectory()` calls `navigator.storage.getDirectory()` then `getDirectoryHandle(this.directoryName, { create: true })` — creates the dir on first call.
3. `set({ key, value: file })` writes a `File` (Blob) atomically via `createWritable()` + `write()` + `close()`. **NOTE:** Unlike the seed spec's `saveProject()`, OpenCut-classic's `OPFSAdapter.set` does NOT use temp-file + atomic rename — it writes directly to the target file. This means a crash mid-write leaves a torn file.
4. `remove(key)` is idempotent on `NotFoundError`.
5. `list()` uses the async iterator `directory.keys()` (defined via global augmentation in `types.ts:60-66`).
6. `clear()` iterates and removes every entry — used by `deleteProjectMedia`.

**Our adoption:** We adopt `OPFSAdapter`'s shape almost verbatim for our `OPFSStorage`, but:
- Add temp-file + atomic rename (`move()`) for project JSON (the seed spec already has this in §4.1 — keep it).
- Keep media writes direct (no temp-file) — media files are immutable once written, so a torn write is rare and we can re-import.
- Add an explicit `quota` pre-check (port `quota.ts`).

### 8.4 OpenCut-classic's 31 migrations — list and runner architecture

**Inventory:** `/tmp/opencut-classic/apps/web/src/services/storage/migrations/` contains exactly **31** migration wrapper files (`v0-to-v1.ts` through `v30-to-v31.ts`) plus a `transformers/` subdirectory with the actual logic (one transformer file per wrapper, same naming).

**Migration framework (`base.ts`, 16 LOC):**

```ts
// /tmp/opencut-classic/apps/web/src/services/storage/migrations/base.ts:1-16
export interface StorageMigrationRunArgs {
  projectId: string;
  project: ProjectRecord;
}
export abstract class StorageMigration {
  abstract from: number;
  abstract to: number;
  abstract run({ projectId, project }: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>>;
}
```

**Each wrapper file** is 14 LOC of pure delegation, e.g. `v0-to-v1.ts`:

```ts
// /tmp/opencut-classic/apps/web/src/services/storage/migrations/v0-to-v1.ts:1-14
import { StorageMigration, type StorageMigrationRunArgs } from "./base";
import type { MigrationResult, ProjectRecord } from "./transformers/types";
import { transformProjectV0ToV1 } from "./transformers/v0-to-v1";

export class V0toV1Migration extends StorageMigration {
  from = 0;
  to = 1;
  async run({ project }: StorageMigrationRunArgs): Promise<MigrationResult<ProjectRecord>> {
    return transformProjectV0ToV1({ project });
  }
}
```

**The `ProjectRecord` type** (`transformers/types.ts:7`): `Record<string, unknown>` — deliberately loose because migrations deal with potentially-malformed data from older versions. **Adoption decision:** keep this looseness in our migration framework. Use `unknown` inputs and validate with Zod only at the end.

**The `MigrationResult<T>` type** (`transformers/types.ts:9-13`):

```ts
export interface MigrationResult<T> {
  project: T;
  skipped: boolean;
  reason?: string;
}
```

Every migration can short-circuit with `{ project, skipped: true, reason: 'already vX' }` — useful for idempotency. **Adoption decision:** adopt this pattern.

**The runner** (`migrations/runner.ts:24-123`, 159 LOC):

```ts
// Simplified from runner.ts:24-123
export async function runStorageMigrations({ migrations, onProgress }) {
  // 1. One-time cleanup: delete old `video-editor-meta` DB (idempotent)
  if (!hasCleanedUpMetaDb) { await deleteDatabase({ dbName: 'video-editor-meta' }); hasCleanedUpMetaDb = true; }

  const projectsAdapter = new IndexedDBAdapter<ProjectRecord>('video-editor-projects', 'projects', 1);
  const projects = await projectsAdapter.getAll();

  const orderedMigrations = [...migrations].sort((a, b) => a.from - b.from);
  let migratedCount = 0;

  for (const project of projects) {
    let currentVersion = getProjectVersion({ project: projectRecord });
    const targetVersion = orderedMigrations.at(-1)?.to ?? currentVersion;

    if (currentVersion >= targetVersion) continue;

    for (const migration of orderedMigrations) {
      if (migration.from !== currentVersion) continue;
      const result = await migration.run({ projectId, project: projectRecord });
      if (result.skipped) break;
      await projectsAdapter.set(projectId, result.project);  // <-- persist after EACH step
      migratedCount++;
      currentVersion = migration.to;
      projectRecord = result.project;
    }
  }

  return { migratedCount };
}
```

**Critical observation:** the runner persists the project after each migration step (`projectsAdapter.set(projectId, result.project)`), not just at the end. This means a crash mid-migration leaves the project at an intermediate version — the next run resumes from that version. **Adoption decision:** adopt this pattern. The `AGENTS.md` policy also says migrations are "additive only" — old fields preserved. Adopt that too.

**The 31 migrations summarized:** see §12 below for the full table. Each migration is small and surgical.

### 8.5 OpenCut-classic `project-manager.ts` and `save-manager.ts` — save flow analysis

**File:** `/tmp/opencut-classic/apps/web/src/core/managers/project-manager.ts` (707 LOC) and `/tmp/opencut-classic/apps/web/src/core/managers/save-manager.ts` (112 LOC).

**Save flow:**

1. **`SaveManager.start()`** (`save-manager.ts:27-38`) subscribes to `editor.scenes` and `editor.timeline` change events. Either event → `markDirty()` → `queueSave()`.

2. **`SaveManager.queueSave()`** (`save-manager.ts:74-82`) clears any existing timer and sets a new `setTimeout` for `this.debounceMs` (default 800ms). When it fires, calls `saveNow()`.

3. **`SaveManager.saveNow()`** (`save-manager.ts:84-105`) — **this is bug #870**:

   ```ts
   // save-manager.ts:84-105
   private async saveNow(): Promise<void> {
     if (this.isSaving) return;                    // <-- BUG: drops the call instead of queueing
     if (!this.hasPendingSave) return;

     const activeProject = this.editor.project.getActive();
     if (!activeProject) return;
     if (this.editor.project.getIsLoading()) return;
     if (this.editor.project.getMigrationState().isMigrating) return;

     this.isSaving = true;
     this.hasPendingSave = false;                  // <-- BUG: cleared BEFORE the await
     this.clearTimer();

     try {
       await this.editor.project.saveCurrentProject();
     } finally {
       this.isSaving = false;
       if (this.hasPendingSave) { this.queueSave(); }   // re-queue if newer changes arrived
     }
   }
   ```

   Two bugs here:
   - **Bug A (line 85):** `if (this.isSaving) return;` — silently drops the call instead of queueing. The next save only fires if `hasPendingSave` was set *during* the in-flight save (via `markDirty()` triggering `queueSave()` while `isSaving` is true — but `queueSave()`'s first check is `if (this.isSaving) return;` at line 75, so it ALSO returns early). Result: a mutation that arrives mid-save is not persisted. **The seed spec's pattern** (`§6.1` above) fixes this by setting `pendingSave = true` and re-looping in the `finally` block.
   - **Bug B (line 94):** `this.hasPendingSave = false;` is set BEFORE `await this.editor.project.saveCurrentProject()`. If a mutation arrives during the await, `markDirty()` sets `hasPendingSave = true`, which the `finally` block then catches and re-queues. But: `saveCurrentProject()` (see below) swallows errors, so the caller never sees a failed write.

4. **`ProjectManager.saveCurrentProject()`** (`project-manager.ts:189-210`) — **this is bug #870 + #873**:

   ```ts
   // project-manager.ts:189-210
   async saveCurrentProject(): Promise<void> {
     if (!this.active) return;

     try {
       const scenes = this.editor.scenes.getScenes();
       const updatedProject = {
         ...this.active,
         scenes,
         metadata: {
           ...this.active.metadata,
           duration: getProjectDurationFromScenes({ scenes }),
           updatedAt: new Date(),
         },
       };

       await storageService.saveProject({ project: updatedProject });
       this.active = updatedProject;            // <-- BUG: overwrites active with stale snapshot
       this.updateMetadata(updatedProject);
     } catch (error) {
       console.error("Failed to save project:", error);   // <-- BUG: swallowed, not rethrown
     }
   }
   ```

   Three bugs here:
   - **Bug C (line 205):** `this.active = updatedProject;` — overwrites the current active project with the snapshot that was captured *before* the await. If a mutation happened during the await, that mutation is now lost from `this.active`.
   - **Bug D (line 208):** `console.error("Failed to save project:", error);` — swallows the error. The caller (`SaveManager.saveNow`) sees `saveCurrentProject()` resolve normally. The user's changes are lost and the UI shows no error.
   - **Bug E (no lock):** No mutex protects against concurrent `saveCurrentProject()` + `renameProject()` / `deleteProjects()`. See Bug #873.

5. **`ProjectManager.ensureStorageMigrations()`** (`project-manager.ts:63-80`) — **this is bug #871**:

   ```ts
   // project-manager.ts:63-80
   private async ensureStorageMigrations(): Promise<void> {
     if (this.storageMigrationPromise) {
       await this.storageMigrationPromise;            // <-- BUG: poison cache
       return;
     }
     this.storageMigrationPromise = (async () => {
       await runStorageMigrations({ migrations, onProgress: (progress) => { ... } });
     })();
     await this.storageMigrationPromise;
   }
   ```

   If `runStorageMigrations()` rejects, `this.storageMigrationPromise` is a permanently-rejected promise. Every subsequent call to `ensureStorageMigrations()` re-awaits it and re-rejects. **The seed spec's fix** (`§5.3` above) clears the promise on rejection.

6. **`ProjectManager.loadProject()`** (`project-manager.ts:128-187`) — also has bug #871:

   ```ts
   // project-manager.ts:128-187
   async loadProject({ id }: { id: string }): Promise<void> {
     if (!this.isInitialized) { this.isLoading = true; this.notify(); }

     this.editor.save.pause();                                          // <-- pause save
     await this.ensureStorageMigrations();                               // <-- OUTSIDE try/finally
     this.editor.media.clearAllAssets();
     this.editor.scenes.clearScenes();

     try {
       const result = await storageService.loadProject({ id });
       // ... rest of load
     } catch (error) {
       console.error("Failed to load project:", error);
       throw error;
     } finally {
       this.isLoading = false;
       this.notify();
       this.editor.save.resume();                                       // <-- resume in finally
     }
   }
   ```

   **Bug F (line 135):** `await this.ensureStorageMigrations()` is OUTSIDE the `try/finally` block. If migration rejects, the `finally` never runs — `isLoading` stays `true`, `editor.save` stays paused. **Fix:** move the migration await inside the try block, or restructure as the kimdogyeom report proposes.

7. **`ProjectManager.renameProject()`** (`project-manager.ts:318-358`) — **this is bug #873**:

   ```ts
   // project-manager.ts:318-358
   async renameProject({ id, name }): Promise<void> {
     try {
       const result = await storageService.loadProject({ id });        // <-- load fresh
       if (!result) { toast.error('Project not found', ...); return; }

       const updatedProject: TProject = {
         ...result.project,
         metadata: { ...result.project.metadata, name, updatedAt: new Date() },
       };
       await storageService.saveProject({ project: updatedProject });  // <-- save

       if (this.active?.metadata.id === id) {
         this.active = updatedProject;                                  // <-- overwrite active
         this.notify();
       }
       this.updateMetadata(updatedProject);
     } catch (error) {
       console.error('Failed to rename project:', error);
       toast.error('Failed to rename project', { ... });
       // <-- no rethrow; caller's await resolves normally
     }
   }
   ```

   Three bugs:
   - **Bug G:** No mutex with `saveCurrentProject()`. If `saveCurrentProject()` is mid-flight (just captured `this.active` with the OLD name), `renameProject()` loads + saves with the NEW name, then `saveCurrentProject()` finishes and overwrites with `this.active = updatedProject` — the OLD name is back. **Seed spec fix:** `withProjectLock(projectId, ...)` (§6.2 above) serializes per-project operations.
   - **Bug H:** `try/catch` swallows the error. Callers like `app/projects/page.tsx:381-391` (the thin wrapper `renameProject({editor, id, name})`) await this method and clear the rename dialog based on the resolved promise — they can't tell success from failure. **Fix:** re-throw the error.
   - **Bug I:** `this.active = updatedProject` overwrites any in-memory mutations that happened during the await. **Fix:** don't overwrite `this.active` if mutations have happened since the rename started; use a generation counter.

8. **`ProjectManager.deleteProjects()`** (`project-manager.ts:276-308`) — **bug #873**:

   ```ts
   // project-manager.ts:276-308
   async deleteProjects({ ids }): Promise<void> {
     const uniqueIds = Array.from(new Set(ids));
     if (uniqueIds.length === 0) return;

     try {
       await Promise.all(
         uniqueIds.map((id) =>
           Promise.all([
             storageService.deleteProjectMedia({ projectId: id }),
             storageService.deleteProject({ id }),                  // <-- concurrent media + record delete
           ]),
         ),
       );
       // ... update memory
       this.notify();
     } catch (error) {
       console.error('Failed to delete projects:', error);          // <-- swallowed
       // <-- no rethrow
     }
   }
   ```

   Three bugs:
   - **Bug J:** `Promise.all` of media-delete + record-delete in parallel — if media-delete fails but record-delete succeeds, you orphan the media. **Seed spec fix:** delete in order: media bytes → media metadata → project record, and report per-phase results.
   - **Bug K:** `Promise.all` across IDs in parallel — half-failures are awkward. **Fix:** sequential per ID, parallel within ID's media-deletion phases.
   - **Bug L:** Errors swallowed. **Fix:** re-throw and let caller show toast.

### 8.6 OpenCut-classic `editor-provider.tsx` — load-on-mount flow

**File:** `/tmp/opencut-classic/apps/web/src/components/providers/editor-provider.tsx` (154 LOC).

**Load-on-mount flow:**

1. `EditorProvider` (lines 23-128) takes a `projectId` prop. On mount (line 30-88) or when `projectId` changes, the `useEffect` runs:
   - Sets `cancelled = false` (line 35).
   - Initializes GPU renderer.
   - Calls `editor.project.loadProject({ id: projectId })` (line 43).
   - If `cancelled` (user navigated away), `return` early without touching state (line 45).
   - Else `setIsLoading(false)` and `loadFontAtlas()`.

2. **The `cancelled` flag pattern (lines 35, 45, 86):**

   ```ts
   let cancelled = false;
   const loadProject = async () => {
     try {
       setIsLoading(true);
       await initializeGpuRenderer();
       editor.renderer.setDegraded(!isGpuAvailable());
       await editor.project.loadProject({ id: projectId });
       if (cancelled) return;            // <-- guard after await
       setIsLoading(false);
       loadFontAtlas();
     } catch (err) {
       if (cancelled) return;
       // ... error handling
     }
   };
   loadProject();
   return () => { cancelled = true; };   // <-- cleanup on unmount
   ```

   This is the React-idiomatic way to handle the "user navigated away during async load" race. **Adoption decision:** adopt this pattern verbatim.

3. **`EditorRuntimeBindings` component (lines 130-154):** Wires up `beforeunload` handler (lines 140-149):

   ```ts
   // editor-provider.tsx:140-149
   useEffect(() => {
     const handleBeforeUnload = (event: BeforeUnloadEvent) => {
       if (!editor.save.getIsDirty()) return;
       event.preventDefault();
       (event as unknown as { returnValue: string }).returnValue = "";
     };
     window.addEventListener('beforeunload', handleBeforeUnload);
     return () => window.removeEventListener('beforeunload', handleBeforeUnload);
   }, [editor]);
   ```

   **Note:** This handler only fires the browser's "leave page?" dialog. It does NOT force-save. If the user clicks "leave", the in-flight dirty state is lost. **Adoption decision:** add a `visibilitychange` listener that triggers `navigator.locks.request('project-save', ...)` for an actual force-save (the seed spec §6.3 already has this).

### 8.7 FreeCut `infrastructure/storage/workspace-fs/projects.ts` + `fs-primitives.ts` — FS-Access API pattern

**Files:**
- `/tmp/freecut/src/infrastructure/storage/workspace-fs/projects.ts` (337 LOC) — projects store backed by user-picked workspace folder.
- `/tmp/freecut/src/infrastructure/storage/workspace-fs/fs-primitives.ts` (399 LOC) — primitives over `FileSystemDirectoryHandle`.

**FS-Access API pattern (from `projects.ts`):**

1. **Each project lives at** `projects/{id}/project.json` with a derived `index.json` entry (`projects.ts:1-12` docblock).
2. **`requireWorkspaceRoot()`** returns the cached `FileSystemDirectoryHandle` picked by the user via `showDirectoryPicker()`.
3. **`stashRootFolderHandle()`** (`projects.ts:53-70`) strips the non-serializable `FileSystemDirectoryHandle` field from the project before JSON-serializing, and stashes it in the IndexedDB `handles-db` (§8.8 below). **`restoreRootFolderHandle()`** re-attaches on load. **This is exactly the complexity we avoid by using OPFS** — handles don't need a side registry.
4. **`refreshIndex(root, persist)`** (`projects.ts:127-141`) rebuilds the index.json cache from a directory scan. `persist` parameter (`'required' | 'best-effort'`, default `'required'`) decides whether a failed index write rethrows or warns — useful pattern for derived caches. **Adoption decision:** keep this concept if we ever add an index.json for fast project listing (deferred to v2).
5. **`upsertIndexEntry()`** (`projects.ts:160-172`) — O(1) targeted update instead of O(N) full scan, with self-heal when index is empty. **Adoption decision:** adopt for our v2 OPFS index (project list scans are O(N) without an index).
6. **`updateProject()`** (`projects.ts:252-297`) — the FreeCut equivalent of OpenCut-classic's `saveProject`. Merges at the serialized layer; only touches the handle registry when `'rootFolderHandle' in updates` (line 264). **This avoids an IndexedDB write on every autosave** — important optimization. We don't need this for OPFS (no handle registry), but the principle of "only touch side state when needed" is worth keeping in mind.

**`fs-primitives.ts` — atomic write pattern:**

```ts
// /tmp/freecut/src/infrastructure/storage/workspace-fs/fs-primitives.ts:236-257
export async function writeJsonAtomic(root, segments, data) {
  return wrap('writeJsonAtomic', () =>
    withKeyLock(writeJsonAtomicLockKey(segments), async () => {     // <-- per-path lock
      const { parent, fileName } = await resolveFileParent(root, segments, true);
      const tmpName = `${fileName}.tmp`;
      const json = JSON.stringify(data, null, 2);

      const tmpHandle = await parent.getFileHandle(tmpName, { create: true });
      const writable = await tmpHandle.createWritable();
      await writable.write(json);
      await writable.close();

      await commitTmpFile(root, parent, tmpHandle, tmpName, fileName, json);
      return json.length;
    }),
  );
}
```

**Three things to learn from this:**

1. **`withKeyLock(key, fn)`** (`workspace-fs/with-key-lock.ts`) serializes per-path writes. **Adoption decision:** adopt this for our `OPFSStorage` — concurrent writes to the same path can deadlock on Chromium's `NoModificationAllowedError` (see `fs-primitives.ts:147-156` comment).

2. **`commitTmpFile()`** (`fs-primitives.ts:196-234`) prefers `FileSystemFileHandle.move(parent, newName)` (truly atomic) and falls back to `targetHandle.createWritable()` + write + `removeEntry(tmpName)` (non-atomic) if `move()` rejects with `NotSupportedError`. **Critical detail (lines 173-189 comment):**

   > `move` is always present on the prototype in Chromium, yet calling it can still reject with NotSupportedError. … Chromium has shipped move() for local files since M111. … Our root always comes from showDirectoryPicker(), so we are never on the guaranteed-OPFS path.

   **Translation for our spec:** for **pure OPFS** (no FS-Access API), `move()` is supported on Chromium 111+ without the NotSupportedError fallback. We are on Chromium 113+ (Decision 4), so `move()` works for our temp-file-then-rename pattern. **But** we should still implement the copy+delete fallback for safety (in case of cloud-synced OPFS — see `fs-primitives.ts:174-180`).

3. **`rootsRejectingMove = new WeakSet<FileSystemDirectoryHandle>()`** (`fs-primitives.ts:190`) caches which roots reject `move()` so at most one doomed `move()` happens per root. **Adoption decision:** adopt this — even in pure OPFS, we want to detect a broken root once and not retry.

**`fs-primitives.ts` — `readJson()`** (`fs-primitives.ts:93-114`) returns `null` on `NotFoundError` (instead of throwing) and wraps corrupt-JSON errors in `WorkspaceFileCorruptError`. The latter lets callers like `getAllProjects()` skip-and-warn instead of failing the whole load. **Adoption decision:** adopt this pattern in our `OPFSStorage` — corrupt project JSON should not abort the entire project list.

### 8.8 FreeCut `infrastructure/storage/handles-db.ts` — IndexedDB handle registry

**File:** `/tmp/freecut/src/infrastructure/storage/handles-db.ts` (276 LOC).

**Purpose:** The ONLY IndexedDB FreeCut uses. Stores `FileSystemDirectoryHandle` / `FileSystemFileHandle` instances (which can't be serialized to JSON or OPFS) so they survive reloads.

**Schema (lines 47-53):**

```ts
interface HandlesDBSchema extends DBSchema {
  handles: {
    key: string;                                // compound: `${kind}:${id}`
    value: HandleRecord;
    indexes: { kind: HandleKind };
  };
}

export type HandleKind = 'workspace' | 'media' | 'project-folder';
export interface HandleRecord {
  key: string;
  kind: HandleKind;
  id: string;
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  name: string;
  pickedAt: number;
  lastSeenPath?: string;     // for "missing file" relinking UX
  lastSeenSize?: number;
  lastSeenMtime?: number;
  activeWorkspaceId?: string; // workspace sentinel pointer
}
```

**API (lines 83-111):**

```ts
export async function getHandle(kind, id): Promise<HandleRecord | null>
export async function saveHandle(record: Omit<HandleRecord, 'key'>): Promise<void>
export async function deleteHandle(kind, id): Promise<void>
async function listHandlesByKind(kind): Promise<HandleRecord[]>
```

**Permission helpers (lines 248-272):** `queryHandlePermission()` / `requestHandlePermission()` wrappers around `FileSystemHandle.queryPermission({mode})` and `requestPermission({mode})`.

**Workspace pointer pattern (lines 113-216):** FreeCut uses two records for the active workspace:
- `workspace:{uuid}` — stable id for each known workspace, survives remove/re-add.
- `workspace:current` — sentinel that points to the active workspace via `activeWorkspaceId`.

This is what lets the UI show a "known workspaces" list. **We don't need any of this for OPFS** — OPFS is single-origin, single-root, always-available. **This is one of the biggest simplifications of our spec** — see §11 Correction #2.

**Migration policy (lines 12-14 comment):** "Schema is v1 forever. Any future evolution creates a parallel DB, not a version bump on this one — avoids the HMR corruption class entirely." **Adoption decision:** if we ever use IndexedDB for something other than OPFS files (e.g. user prefs, undo history), use this "parallel DB per schema version" pattern instead of IndexedDB version bumps. It avoids the `onupgradeneeded` HMR-reload corruption issue.

### 8.9 FreeCut `shared/projects/migrations/` — schema versioning approach

**File:** `/tmp/freecut/src/shared/projects/migrations/types.ts` (66 LOC) + `migrations.ts` (1011 LOC) + `index.ts` (121 LOC) + `normalize.ts`.

**FreeCut's current schema version:** `CURRENT_SCHEMA_VERSION = 15` (`types.ts:13`).

**Migration shape (`types.ts:24-31`):**

```ts
export interface Migration {
  /** Target version (the version after this migration runs) */
  version: number;
  /** Human-readable description of what this migration does */
  description: string;
  /** The migration function */
  migrate: MigrationFn;
}
export type MigrationFn = (project: Project) => Project;
```

Note: FreeCut's `MigrationFn` is **synchronous**, takes a typed `Project` (not `unknown`). OpenCut-classic uses `ProjectRecord = Record<string, unknown>` and an async `run()`. **Adoption decision:** follow OpenCut-classic's pattern (`unknown` input, async, optional `MigrationResult.skipped` flag) because (a) migrations must handle malformed data, and (b) async lets us await OPFS writes mid-migration if needed.

**Migration registry (`migrations.ts:300-1010`):** a `Record<number, Migration>` with versions 2–15 (14 migrations). Each migration is a pure function that takes a `Project` and returns a migrated `Project`. **See §8.9.1 below for the 14 FreeCut migrations.**

**Two-stage architecture (`index.ts:53-121`):**

```ts
// Stage 1: version-based migrations (only run if schemaVersion < CURRENT_SCHEMA_VERSION)
const { project: migrated, appliedMigrations, fromVersion } = runMigrations(project);
// Stage 2: normalization (runs on EVERY load — applies current defaults, repairs overlaps)
const warnings: ProjectWarning[] = [];
const normalized = normalizeProject(migrated, warnings);
```

**Adoption decision:** adopt FreeCut's two-stage architecture. Version migrations are for breaking changes (rare). Normalization runs every load and silently fixes minor issues (e.g., overlapping items, missing `type` on shape elements) — collecting `ProjectWarning[]` for the UI to surface. This is the cleanest split we saw across both repos.

**FreeCut's 14 migrations:**

1. v2 — "Fix track height from 80px to 64px (constants consistency)"
2. v3 — "Add alignment default (0.5) to transitions for asymmetric timing"
3. v4 — "Increase track height from 64px to 80px for 3-row clip layout"
4. v5 — "Convert transitions from virtual-window model to FCP-style overlap model"
5. v6 — "Migrate legacy effects (CSS filters, glitch, halftone, vignette, color grading) to GPU shader effects"
6. v7 — "Add blend mode, masks, and corner pin fields to timeline items" (no-op placeholder)
7. v8 — "Convert legacy overlap transitions back to cut-centered handle-based transitions"
8. v9 — "Renumber legacy track orders and backfill missing originId fields"
9. v10 — "Introduce project-scoped masterBusDb (split from per-device monitor volume). Defaults to 0 dB = unity."
10. v11 — "Convert gpu-gradient-map from fixed shadow/mid/highlight colors to preset + custom stops"
11. v12 — "Sanitize motion-text specs (textMotion) on text items"
12. v13 — "Add topLevelSequenceIds for standalone timeline tabs (multi-timeline)" (no-op)
13. v14 — "Add sequence vs composite-2d composition editor kind"
14. v15 — "Version animation records for vector Position and Scale lanes"

**Observations:**
- FreeCut's 14 migrations are mostly small domain-specific repairs (track heights, transition models, effects pipeline). OpenCut-classic's 31 migrations are more infrastructure-heavy (storage shape changes, font weights, sticker→graphic renames, seconds→ticks conversion). This suggests **FreeCut's schema was more stable from the start** (better forward-compatible optional fields), while OpenCut-classic's schema went through several major refactors. **Adoption decision:** use FreeCut's "optional fields with sensible defaults" approach over OpenCut-classic's "additive-only migration" approach. Both work, but FreeCut's means fewer migrations needed.
- Notable: **FreeCut v6 migrates CSS-filter effects to GPU shader effects** — a major refactor. The closest OpenCut-classic equivalent is v21-to-v22 (color parsing refactor) and v22-to-v23 (seconds→ticks conversion). Both repos have at least one "big bang" migration.

### 8.10 Browser OPFS API verification

The seed asked: *"Verify `navigator.storage.getDirectory()` returns the root `FileSystemDirectoryHandle`; `getDirectoryHandle(name, { create: true })`; `getFileHandle(name, { create: true })`; `createWritable()` returns a `FileSystemWritableFileStream`; `move(newName)` for atomic rename; worker-context access; browser support matrix."*

**Verified facts:**

| API | Chromium | Firefox | Safari | Notes |
|---|---|---|---|---|
| `navigator.storage.getDirectory()` (OPFS root) | 86+ (Oct 2020) | 111+ (Mar 2023) | 15.2+ (Dec 2021), stable 16.4+ | All major browsers now supported. |
| `getDirectoryHandle(name, { create: true })` | 86+ | 111+ | 16.4+ | Same as above. |
| `getFileHandle(name, { create: true })` | 86+ | 111+ | 16.4+ | Same. |
| `createWritable()` → `FileSystemWritableFileStream` | 86+ | 111+ | 16.4+ | Same. |
| `FileSystemFileHandle.move(name)` (atomic rename) | **111+** (Mar 2023) | ❌ NOT SUPPORTED | ❌ NOT SUPPORTED | **Chromium-only as of late 2024.** Firefox/Safari have not implemented. |
| OPFS access from Worker context (`navigator.storage.getDirectory()` inside a Worker) | 86+ | 111+ | **17+** (later than main thread) | Safari needed an extra release. |
| OPFS synchronous access (`createSyncAccessHandle()`, Worker-only) | 102+ | 111+ | 16.4+ | Available only in Workers. We don't need this — async is fine. |
| `navigator.storage.estimate()` (quota) | 55+ | 57+ | 15.2+ | Broadly available. |

**Source:** MDN Web Docs, caniuse.com, FreeCut's own observation in `fs-primitives.ts:173-189` (quoted in §8.7) — "`move` is always present on the prototype in Chromium, yet calling it can still reject with NotSupportedError. … Chromium has shipped move() for local files since M111." Note: FreeCut's observation was for the FS-Access API (non-OPFS roots). For pure OPFS roots, `move()` works without the `NotSupportedError` fallback on Chromium 111+.

**Implications for the seed spec:**

- The seed spec's `OPFSStorage.saveProject()` (§4.1 above) uses `tempHandle.move(\`${id}.json\`)` for atomic rename. **This works on Chromium 111+ but NOT on Firefox or Safari.** Since our browser matrix (master spec §5) is **Chromium 113+ only**, this is fine for v1. If we ever expand to Safari/Firefox, we need the FreeCut-style `commitTmpFile()` fallback (copy + delete, non-atomic).
- **Add to seed spec:** a `commitTmpFile()` fallback in §4.1, even though it's not currently used. Cost: ~20 lines. Benefit: forward-compat with Safari/Firefox if the browser matrix expands.
- The `opfs.worker.ts` (referenced in §4.2) can use `navigator.storage.getDirectory()` directly — confirmed supported in Workers on Chromium 86+. No special import needed.
- The `createSyncAccessHandle()` API is Worker-only and gives synchronous access — useful for performance-critical media reads. **Adoption decision:** investigate for P5 (FCPXML export) where we read media sequentially. Deferred for now.

### 8.11 Zod schema design verification

The seed asked: *"Verify our `ProjectSchema` covers all cases. Consider discriminated unions for element types, optional vs. required fields, defaults for missing fields (for forward-compatibility)."*

**Verified facts:**

1. **Discriminated unions for element types.** Zod's `z.discriminatedUnion('type', [...])` is well-supported (Zod 3.x+). For our 6 element types:

   ```ts
   const VideoElementSchema = z.object({
     type: z.literal('video'),
     id: z.string().uuid(),
     trackId: z.string().uuid(),
     startTime: MediaTimeSchema,
     duration: MediaTimeSchema,
     sourceStart: MediaTimeSchema,
     sourceDuration: MediaTimeSchema,
     mediaId: z.string().uuid(),
     speed: z.number().default(1),
     volume: z.number().default(1),
     muted: z.boolean().default(false),
     opacity: z.number().min(0).max(1).default(1),
     visible: z.boolean().default(true),
     effects: z.array(EffectSchema).default([]),
     masks: z.array(MaskSchema).default([]),
     transitionIn: TransitionSchema.optional(),
     transitionOut: TransitionSchema.optional(),
     name: z.string(),
     color: z.string().optional(),
   });
   // ... 5 more for audio/text/image/shape/adjustment
   const ElementSchema = z.discriminatedUnion('type', [
     VideoElementSchema, AudioElementSchema, TextElementSchema,
     ImageElementSchema, ShapeElementSchema, AdjustmentElementSchema,
   ]);
   ```

   **Key gotcha:** `z.discriminatedUnion` requires the discriminator field (`type`) to be present and a string literal in every variant. This works for our `type: 'video' | 'audio' | ...` discriminator. ✅

2. **Optional vs. required fields with defaults.** Zod supports three patterns:
   - `z.string()` — required, must be present.
   - `z.string().optional()` — input may be `undefined`; output is `string | undefined`. Schema infers `string | undefined` for both.
   - `z.string().default('foo')` — input may be omitted; output is always `string`. Schema infers input `string | undefined` and output `string`. **This is what we want for forward-compatibility** — old project files missing a field get the default on load.
   - `z.string().optional().default('foo')` — input may be `undefined`; output always `string`. Functionally same as `.default('foo')` for our purposes.
   - `z.string().catch('foo')` — input may be malformed (wrong type); output is always `string`. **Use this for legacy data with possibly-wrong types** (e.g., OpenCut-classic v0 had `fps` as `number` instead of `{numerator, denominator}`).

   **Adoption decision:** use `.default(...)` for new fields added in v2+ migrations, use `.catch(...)` for parsing legacy v0/v1 data with known shape variations.

3. **Branded types.** Zod supports branded types via `.brand()`:

   ```ts
   const MediaTimeSchema = z.number().int().nonnegative().brand<'MediaTime'>();
   type MediaTime = z.infer<typeof MediaTimeSchema>;  // number & { [BRAND]: { MediaTime: true } }
   ```

   **Pitfall:** branded types do NOT survive `JSON.stringify` — `JSON.stringify(mediaTime)` outputs the plain number, not an object. On deserialize, `JSON.parse(text)` returns plain `number`, and `MediaTimeSchema.parse(plainNumber)` re-brands it. ✅ This works for our pattern.

   **Another pitfall:** `.brand<'MediaTime'>()` requires Zod ≥3.21 (when `z.brand()` was renamed from the deprecated `z.branded()`). Make sure our `package.json` pins `zod@^3.21`.

4. **Pitfall — `.transform()` vs `.default()`:** if you need to transform input (e.g., `fps: number` → `fps: {numerator, denominator}`), use `.transform()` instead of `.default()`. But `.transform()` changes the output type, which can break `.optional()` chaining. **Pattern:**

   ```ts
   const FrameRateSchema = z.union([
     z.object({ numerator: z.number().int().positive(), denominator: z.number().int().positive() }),
     z.number().positive().transform(n => ({
       numerator: n, denominator: 1,   // crude; real impl uses GCD like OpenCut v22-to-v23
     })),
   ]);
   ```

   This accepts both `{numerator, denominator}` (new shape) and bare `number` (legacy shape) — useful during the v1→v2 FrameRate migration. **Adoption decision:** if we ever need to migrate from bare-number `fps` to rational `{numerator, denominator}`, port OpenCut-classic's `v22-to-v23.ts` `migrateFrameRate()` function (`transformers/v22-to-v23.ts:286-320`).

### 8.12 Project thumbnail flow

The seed asked: *"How is the project thumbnail generated and stored?"*

**OpenCut-classic's pattern (`project-manager.ts:650-686`):**

```ts
private async updateThumbnailFromTimeline(): Promise<boolean> {
  if (!this.active) return false;

  const tracks = this.editor.scenes.getActiveScene().tracks;
  const mediaAssets = this.editor.media.getAssets();
  const duration = this.editor.timeline.getTotalDuration();
  const { canvasSize, background } = this.active.settings;

  const scene = buildScene({ tracks, mediaAssets, duration: duration || 1, canvasSize, background });

  const renderer = new CanvasRenderer({
    width: canvasSize.width, height: canvasSize.height,
    fps: this.active.settings.fps,
  });

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvasSize.width;
  tempCanvas.height = canvasSize.height;

  await renderer.renderToCanvas({ node: scene, time: 0, targetCanvas: tempCanvas });

  const thumbnailDataUrl = tempCanvas.toDataURL("image/png");  // <-- base64 PNG data URL

  await this.updateThumbnail({ thumbnail: thumbnailDataUrl });  // <-- stored in metadata.thumbnail
  return true;
}
```

**Observations:**

1. OpenCut-classic renders at `time: 0` (line 678) — first frame only. **Adoption decision:** allow user to pick the thumbnail frame (set via a `metadata.thumbnailTime: MediaTime`, default `0`).
2. OpenCut-classic uses `image/png` — large file (PNG is lossless but inefficient for thumbnails). **Adoption decision:** use `image/jpeg` at 0.8 quality, 320×180 (same as `generateThumbnail` in seed §7.4).
3. OpenCut-classic stores the thumbnail as a **base64 data URL inside `metadata.thumbnail`** — bloats the project JSON. Every save re-serializes this. **Adoption decision:** use our `thumbnailId?: string` pattern (seed §3.1, line 55) — store the thumbnail as a file in `thumbnails/{project-id}.jpg` in OPFS, reference by ID. The FreeCut pattern is similar (`project.thumbnailId?: string` — `types/project.ts:34`).
4. OpenCut-classic calls `updateThumbnailFromTimeline()` on `prepareExit()` (line 538) and on first load (line 171). **Adoption decision:** generate thumbnail on first save (lazily), then only regenerate if the user explicitly requests or if the first-frame content changes (compare hash).

### 8.13 FCPXML color metadata cross-reference

The seed asked: *"When we export FCPXML (see `10-fcpxml-export.md`), we may need to include color metadata (BT.709 vs BT.2020, transfer function). Verify this is captured in `ProjectSettings.displayMode`."*

**Cross-reference with `10-fcpxml-export.md` (SCOUT-10-RETRY corrected pattern):**

The FCPXML exporter (spec 10 §4.2, post-SCOUT-10-RETRY) splits color-space emission into two functions: `formatColorSpaceTriplet(displayMode)` for the `<format>` resource, and `formatColorSpaceOverride(colorInfo, displayMode)` for the `<asset>` element. The seed spec's old `formatColorAttrs(colorInfo)` — which emitted bare names like `"Rec. 709"` directly on `<asset>` — is **wrong** (DTD puts `colorSpace` on `<format>`, not `<asset>`; values are triplets `"<cp>-<tc>-<mc> (<name>)"`, not bare names; per-asset overrides use `colorSpaceOverride`). The correct pair of functions:

```ts
// Emits the colorSpace attribute VALUE (without the `colorSpace="..." ` wrapper)
// for the <format> resource. Called once per project — the sequence references
// this <format> via format="<formatId>", and inherits the color space.
// Per Apple's DTD comment (FCPXMLv1_10.dtd lines 70-73) + Apple docs:
// Format is "<cp>-<tc>-<mc> (<name>)" per ISO/IEC 23001-8.
//
// IMPORTANT: colorSpace lives on <format>, NOT on <asset> or <sequence>.
// <sequence> has NO colorSpace attribute (DTD lines 418-423 — see spec 10 §13
// Correction #7). <asset> has colorSpaceOverride (DTD line 99), used only for
// per-asset overrides.
private formatColorSpaceTriplet(displayMode: DisplayMode): string {
  // Well-known triplets (DTD lines 70-73):
  //   "1-1-1 (Rec. 709)"           — BT.709 / BT.709 transfer / BT.709 matrix  (SDR)
  //   "9-1-9 (Rec. 2020)"          — BT.2020 / BT.709 transfer / BT.2020-ncl  (SDR wide gamut)
  //   "9-16-9 (Rec. 2020 PQ)"     — BT.2020 / SMPTE ST 2084 PQ / BT.2020-ncl (HDR)
  //   "9-18-9 (Rec. 2020 HLG)"     — BT.2020 / BT.2100 HLG / BT.2020-ncl     (HDR)
  // (Note: "9-14-9 (Rec. 2020)" is the SDR transfer=1.0 gamma variant — not used by us.)

  if (displayMode.primaries === 'bt709') {
    // transfer 'srgb' or 'bt709' both map to BT.709 OETF in the FCPXML model.
    return '1-1-1 (Rec. 709)';
  }
  if (displayMode.primaries === 'bt2020') {
    if (displayMode.transfer === 'pq')  return '9-16-9 (Rec. 2020 PQ)';
    if (displayMode.transfer === 'hlg') return '9-18-9 (Rec. 2020 HLG)';
    // 'srgb' / 'bt709' transfer → BT.709 transfer in BT.2020 primaries (SDR wide gamut)
    return '9-1-9 (Rec. 2020)';
  }
  if (displayMode.primaries === 'display-p3') {
    // Display P3 is NOT a well-known triplet in the FCPXML 1.10 DTD (added in 1.11 / FCP 10.6).
    // Per SCOUT-10 finding: fall back to Rec. 709 (with a runtime warning) for v1.10 compatibility.
    // An experimental raw triplet "8-1-8" is unverified and requires manual testing.
    // See spec 10 §13 Correction #4 + §11 Q8.
    console.warn('[FCPXML] Display P3 not in v1.10 DTD — falling back to Rec. 709. ' +
                 'Upgrade target to FCPXML 1.11+ for true Display P3 support.');
    return '1-1-1 (Rec. 709)';
  }
  return '1-1-1 (Rec. 709)';  // safe default
}

// Returns the colorSpaceOverride VALUE (or null if no override is needed — i.e.,
// the asset inherits the format's color space). Called per <asset>.
// Per Apple docs: "colorSpaceOverride — The same as the colorSpace attribute
// of the format element." For still images, the special values
// "sRGB IEC61966-2.1" and "Adobe RGB (1998)" are also accepted.
private formatColorSpaceOverride(colorInfo: MediaColorInfo, displayMode: DisplayMode): string | null {
  const assetTriplet = this.deriveAssetTriplet(colorInfo);
  const seqTriplet  = this.formatColorSpaceTriplet(displayMode);
  if (assetTriplet === seqTriplet) return null;  // no override — inherit format
  return assetTriplet;
}

// Helper: maps a per-asset MediaColorInfo to a triplet string.
// (Mirrors formatColorSpaceTriplet but on MediaColorInfo, which has more
// granularity: 'smpte-c' primaries, 'srgb'/'bt709' transfer distinction, etc.)
private deriveAssetTriplet(colorInfo: MediaColorInfo): string {
  // Still-image sRGB gets the special still-image form, not a triplet.
  // (Detected upstream: media.type === 'image' && colorInfo.primaries === 'srgb'
  //  is a separate code path — see spec 10 §4.2 still-image branch.)

  if (colorInfo.primaries === 'bt709') {
    return '1-1-1 (Rec. 709)';
  }
  if (colorInfo.primaries === 'bt2020') {
    if (colorInfo.transfer === 'pq')  return '9-16-9 (Rec. 2020 PQ)';
    if (colorInfo.transfer === 'hlg') return '9-18-9 (Rec. 2020 HLG)';
    return '9-1-9 (Rec. 2020)';  // 'srgb' or 'bt709' transfer
  }
  if (colorInfo.primaries === 'smpte-c') {
    // Rec. 601 (NTSC/PAL SD). The DTD lists both 6-1-6 (NTSC) and 5-1-6 (PAL);
    // matrix 'bt601' (single value) does not disambiguate NTSC vs PAL.
    // Default to NTSC (6-1-6) — caller can override if PAL is needed.
    return '6-1-6 (Rec. 601 NTSC)';
  }
  if (colorInfo.primaries === 'display-p3') {
    // Same fallback as formatColorSpaceTriplet — Display P3 not in v1.10 DTD.
    return '1-1-1 (Rec. 709)';
  }
  return '1-1-1 (Rec. 709)';  // safe default
}
```

The XML emission then looks like:

```xml
<!-- <format> carries the project's color space (one per project) -->
<format id="r1" name="FFVideoFormat1080p30"
        frameDuration="100/3000s"
        width="1920" height="1080"
        colorSpace="1-1-1 (Rec. 709)"/>

<!-- <asset> inherits the format's color space; override only when asset differs -->
<asset id="r2" name="HDR_Clip.mov" uid="..." src="..."
       start="0s" duration="10s" hasVideo="1" hasAudio="1"
       colorSpaceOverride="9-16-9 (Rec. 2020 PQ)">
  <media-rep kind="original-media" src="file://localhost/.../HDR_Clip.mov"/>
</asset>
```

**Verified facts:**

1. **`MediaColorInfo` (seed §3.1) captures** `primaries`, `transfer`, `matrix`, `range`. The FCPXML exporter uses `primaries` + `transfer` to derive the triplet string. **`matrix` and `range` are NOT used by FCPXML** — FCPXML 1.10 doesn't expose YUV matrix or range as separate attributes. They're implied by `colorSpace` (Rec.709 = BT.709 matrix + limited range; Rec.2020 = BT.2020-ncl + limited range). **Adoption decision:** keep `matrix` and `range` in our `MediaColorInfo` for our renderer's use (decode + display), but they don't flow to FCPXML.

2. **`ProjectSettings.displayMode`** (seed §3.1) captures the **project's output color space** — what the canvas displays and what the `<format>` resource declares. This is different from per-media `MediaColorInfo`. The FCPXML exporter derives the `<format colorSpace="...">` triplet from `ProjectSettings.displayMode.primaries` + `transfer` via `formatColorSpaceTriplet(displayMode)`. **CRITICAL:** the `<sequence>` element does NOT have its own `colorSpace` attribute (per spec 10 §13 Correction #7 — DTD lines 418-423 show `<sequence>` only has `format IDREF #REQUIRED`, `resolution`, `role`, `configName`, `configSource`, `keywords`). The sequence references the `<format>` resource (which carries `colorSpace`) via `format="r1"`. The original seed's "sequence-level colorSpace" framing was incorrect; the format resource is the single source of truth for the project's color space.

3. **Color metadata captured for FCPXML 1.10's known colorSpace triplets:**

   | Our `MediaColorInfo.primaries` | Our `MediaColorInfo.transfer` | FCPXML `<format>` colorSpace triplet |
   |---|---|---|
   | `bt709` | `srgb` (or `bt709`) | `"1-1-1 (Rec. 709)"` |
   | `bt2020` | `srgb` (SDR) | `"9-1-9 (Rec. 2020)"` |
   | `bt2020` | `pq` | `"9-16-9 (Rec. 2020 PQ)"` |
   | `bt2020` | `hlg` | `"9-18-9 (Rec. 2020 HLG)"` |
   | `smpte-c` (legacy NTSC) | `srgb` | `"6-1-6 (Rec. 601 NTSC)"` |
   | `smpte-c` (legacy PAL) | `srgb` | `"5-1-6 (Rec. 601 PAL)"` (matrix disambiguation needed upstream) |
   | `display-p3` | `srgb` | **NOT in v1.10 DTD** — fall back to `"1-1-1 (Rec. 709)"` with a runtime warning (per SCOUT-10). True Display P3 requires FCPXML 1.11+ / FCP 10.6. |
   | `srgb` (image still) | `srgb` | `colorSpaceOverride="sRGB IEC61966-2.1"` on `<asset>` (special still-image form, NOT a triplet, NOT on `<format>`) |

4. **Coverage matrix:** the seed's `MediaColorInfo.primaries: 'bt709' | 'bt2020' | 'smpte-c' | 'display-p3'` covers FCPXML's accepted primary sets (with Display P3 falling back). The seed's `transfer: 'srgb' | 'pq' | 'hlg' | 'bt709'` covers all FCPXML transfer functions. The `'bt709'` transfer (a separate value from `'srgb'`) is a legacy video transfer function (BT.709 OETF) — slightly different from sRGB's display EOTF. **Adoption decision:** keep both as distinct values; the renderer maps `'bt709'` to BT.709 OETF inverse, the FCPXML exporter maps both `'srgb'` and `'bt709'` to the same triplet (`"1-1-1 (Rec. 709)"` for `primaries: 'bt709'`).

5. **`DisplayMode.toneMap`** (seed §3.1) is for HDR → SDR preview tonemapping. **NOT a FCPXML concern** — FCPXML carries the source color space verbatim; the downstream NLE handles tonemapping. **Adoption decision:** keep `toneMap` for our preview canvas only; do not export to FCPXML.

6. **`DisplayMode` schema (spec 09 §3.1, lines 81-85)** already captures the triplet info needed to emit the FCPXML correctly — `primaries` + `transfer` are sufficient inputs for `formatColorSpaceTriplet(displayMode)`. No schema change required; the FCPXML emission is purely a derivation. The only thing consumers must remember: **`DisplayMode.primaries: 'display-p3'` is a *renderer* concept (canvas display) — at FCPXML export time it falls back to Rec. 709 per the v1.10 DTD limitation** (point 3 above + SCOUT-10 finding).

---

## 9. Test Plan for This Stream

1. **Schema validation test:** Generate valid and invalid project JSON. Assert Zod schema accepts/rejects correctly.

2. **Round-trip test:** Create project → serialize → deserialize → compare. Assert deep equal.

3. **Persistence test:** Save project → reload → compare. Assert deep equal.

4. **Autosave test:** Modify project rapidly (100 changes in 1 second). Assert: only one save happens (debounced); final saved state matches latest.

5. **Race test:** Trigger save, then immediately trigger rename. Assert: rename waits for save, no data loss.

6. **Migration test:** Create a v1 project, manually craft a v0 (or hypothetical future v2), assert migration runs correctly.

7. **Migration failure test:** Trigger a migration that fails. Assert: error propagates, migration promise cleared (not cached like OpenCut-classic #871), retry succeeds.

8. **Media import test:** Import a 1080p H.264 file. Assert: file saved to OPFS, MediaRecord added, thumbnail generated.

9. **Media deletion test:** Delete media that's used in timeline. Assert: media removed from library, elements removed from timeline, file deleted from OPFS.

10. **Large project test:** Load a project with 1000 elements, 50 tracks, 100 media files. Assert: load completes <1s, save completes <2s.

11. **OPFS quota test:** Save 100 media files totaling 1 GB. Assert: no errors. Save 100 more (10 GB). Assert: handles quota exceeded gracefully (error message, not silent failure).

12. **Visibility/unload test:** Modify project, switch tabs. Assert: autosave fires on visibilitychange. Close tab. Assert: beforeunload fires and save attempts.

13. **[NEW] Poison-cache test (SCOUT-09):** Trigger a migration that rejects. Call `ensureMigrations()` again. Assert: (a) the second call re-runs the migration (not cached); (b) if the migration succeeds on retry, it's cached thereafter; (c) concurrent callers share one in-flight promise.

14. **[NEW] Concurrent save + rename test (SCOUT-09):** Start `saveCurrentProject()` (delayed), then call `renameProject()`. Assert: rename waits for save; final state has both the new name and the latest timeline mutations; no overwrite of newer state by the older snapshot.

15. **[NEW] Partial-delete test (SCOUT-09):** Make `deleteProjectMedia` reject for project A while `deleteProject` succeeds. Assert: per-phase result returned with `{projectId: A, failedPhase: 'media-bytes', recordDeleted: true}`; UI shows partial-failure toast.

---

## 10. Code References

Every file read by the scout with a one-line summary.

### 10.1 OpenCut-classic (`/tmp/opencut-classic`)

| File (path relative to repo root) | LOC | Summary |
|---|---|---|
| `apps/web/src/project/types.ts` | 55 | `TProject`, `TProjectMetadata`, `TProjectSettings`, `TBackground`, `TCanvasSize`, `TTimelineViewState`, sort types. Imports `MediaTime` from `@/wasm` and `FrameRate` from `opencut-wasm`. |
| `apps/web/src/timeline/types.ts` | 287 | `TScene`, `SceneTracks`, all `*Track` and `*Element` types, `ElementDragState`, `DropTarget`, `ClipboardItem`. The primary type-design teacher for our schema. |
| `apps/web/src/services/storage/types.ts` | 66 | `StorageAdapter<T>` interface (5 methods), `SerializedProject`, `SerializedScene`, `MediaAssetData`, `StorageConfig`. Global augmentation for `FileSystemDirectoryHandle` async iterators. |
| `apps/web/src/services/storage/indexeddb-adapter.ts` | 127 | `IndexedDBAdapter<T>` class implementing `StorageAdapter<T>` over IndexedDB with `keyPath: 'id'`. `deleteDatabase()` helper. |
| `apps/web/src/services/storage/opfs-adapter.ts` | 79 | `OPFSAdapter` class implementing `StorageAdapter<File>` for media blobs via `navigator.storage.getDirectory()`. Static `isSupported()` check. **The pattern we adopt.** |
| `apps/web/src/services/storage/service.ts` | 575 | `StorageService` singleton — projects + media + sounds adapter. Contains the `ensureMigrations()` poison-cache bug (#871). |
| `apps/web/src/services/storage/quota.ts` | 147 | `StorageQuotaExceededError`, `readStorageQuotaStatus()`, `evaluateStorageCapacity()`. Used for pre-save capacity checks. |
| `apps/web/src/services/storage/use-storage-persistence.ts` | 45 | React hook for the storage persistence UI dialog. |
| `apps/web/src/services/storage/use-local-storage.ts` | 58 | React hook wrapping `localStorage` for UI prefs. |
| `apps/web/src/services/storage/migrations/base.ts` | 16 | `StorageMigration` abstract class with `from`/`to`/`run({projectId, project})`. The base for all 31 migrations. |
| `apps/web/src/services/storage/migrations/index.ts` | 70 | Exports `CURRENT_PROJECT_VERSION = 31` and the `migrations` array of all 31 `*Migration` instances. |
| `apps/web/src/services/storage/migrations/runner.ts` | 159 | `runStorageMigrations()` — iterates all projects, applies each applicable migration in order, persists after each step (resumable). |
| `apps/web/src/services/storage/migrations/AGENTS.md` | 10 | Policy: "Migrations are additive only." Don't delete/rename persisted data in a migration. |
| `apps/web/src/services/storage/migrations/v0-to-v1.ts` through `v30-to-v31.ts` (31 files) | 14 each | Thin wrappers delegating to `transformers/v{N}-to-v{N+1}.ts`. |
| `apps/web/src/services/storage/migrations/transformers/types.ts` | 13 | `ProjectRecord = Record<string, unknown>` (deliberately loose), `MigrationResult<T> = {project, skipped, reason?}`. |
| `apps/web/src/services/storage/migrations/transformers/utils.ts` | 28 | `isRecord()`, `getProjectId()` — handle legacy id locations (top-level vs. metadata.id). |
| `apps/web/src/services/storage/migrations/transformers/v0-to-v1.ts` | 67 | Adds a default `Main scene` with UUID and createdAt. Skips if scenes already exist. |
| `apps/web/src/services/storage/migrations/transformers/v1-to-v2.ts` | 262 | Big migration: introduces `transform`/`opacity` on every element, `settings.background` discriminated union, default canvas/fps. Frozen v2-era defaults at top of file. |
| `apps/web/src/services/storage/migrations/transformers/v2-to-v3.ts` | 84 | Adds `metadata.duration` computed from scenes (sum of `startTime + duration`). |
| `apps/web/src/services/storage/migrations/transformers/v3-to-v4.ts` | (multi-hundred) | Normalizes text `fontWeight` from `'normal'/'bold'` to `'400'/'700'` numeric strings. |
| `apps/web/src/services/storage/migrations/transformers/v4-to-v5.ts` | ~150 | Migrates legacy `sticker` elements to a normalized `stickerId` from known provider set (icons/emoji/flags/shapes). |
| `apps/web/src/services/storage/migrations/transformers/v5-to-v6.ts` | ~100 | Migrates `scene.bookmarks` from bare-number to `{time: number}` object form. |
| `apps/web/src/services/storage/migrations/transformers/v6-to-v7.ts` | ~150 | Migrates text elements' content/typography fields. |
| `apps/web/src/services/storage/migrations/transformers/v7-to-v8.ts` | ~150 | Adds shape/params to elements. |
| `apps/web/src/services/storage/migrations/transformers/v8-to-v9.ts` | ~150 | Migrates text element typography fields again. |
| `apps/web/src/services/storage/migrations/transformers/v9-to-v10.ts` | 21 | Pure version bump: `{ ...project, version: 10 }` — no field changes. |
| `apps/web/src/services/storage/migrations/transformers/v10-to-v11.ts` | ~150 | Migrates `transform.scale` from `{x, y}` to flat `scaleX`/`scaleY`. |
| `apps/web/src/services/storage/migrations/transformers/v11-to-v12.ts` | ~200 | Migrates `transform.position` to flat `positionX`/`positionY` with keyframe interpolation. |
| `apps/web/src/services/storage/migrations/transformers/v12-to-v13.ts` | ~200 | Adds `masks` field to maskable elements (video/image/graphic). |
| `apps/web/src/services/storage/migrations/transformers/v13-to-v14.ts` | ~250 | Splits `masks` into separate mask + stroke structures. |
| `apps/web/src/services/storage/migrations/transformers/v14-to-v15.ts` | ~100 | Backfills `intrinsicWidth`/`intrinsicHeight` on sticker elements (fallback `200`). |
| `apps/web/src/services/storage/migrations/transformers/v15-to-v16.ts` | ~100 | Renames sticker tracks → graphic tracks. |
| `apps/web/src/services/storage/migrations/transformers/v16-to-v17.ts` | ~100 | Backfills `strokeAlign` on mask stroke params. |
| `apps/web/src/services/storage/migrations/transformers/v17-to-v18.ts` | ~150 | Migrates `volume` from linear gain to dB via `linearGainToDb()`, clamped to `[-60, +20]`. |
| `apps/web/src/services/storage/migrations/transformers/v18-to-v19.ts` | ~50 | Migrates canvas-size settings (`lastCustomCanvasSize`, `originalCanvasSize` added). |
| `apps/web/src/services/storage/migrations/transformers/v19-to-v20.ts` | ~100 | Adds `isSourceAudioEnabled` to video elements (toggles embedded audio). |
| `apps/web/src/services/storage/migrations/transformers/v20-to-v21.ts` | ~100 | Rescales `background.blurIntensity` from old scale (50) to new (÷5 → 10) via `INTENSITY_TO_SIGMA_DIVISOR = 5`. |
| `apps/web/src/services/storage/migrations/transformers/v21-to-v22.ts` | ~300 | Major: parses legacy CSS color strings via `culori` library → converts to linear RGBA. Migrates legacy animation keyframes to new channel schema. |
| `apps/web/src/services/storage/migrations/transformers/v22-to-v23.ts` | 340 | Major: converts all time fields from seconds (floats) to ticks (integer at 120,000 ticks/sec). Also migrates `fps` from `number` to rational `{numerator, denominator}` using GCD. **Most important migration to study.** |
| `apps/web/src/services/storage/migrations/transformers/v23-to-v24.ts` | ~150 | Restructures `tracks` from a flat array to `{overlay, main, audio}` SceneTracks shape. |
| `apps/web/src/services/storage/migrations/transformers/v24-to-v25.ts` | ~150 | Migrates `transform.position` animation channel IDs from `transform.position:x/y` to `transform.positionX/Y:value`. |
| `apps/web/src/services/storage/migrations/transformers/v25-to-v26.ts` | 130 | Repairs the v24→v25 bug (spread flat array into numeric-keyed object instead of object). Reconstructs proper `{overlay, main, audio}` shape. |
| `apps/web/src/services/storage/migrations/transformers/v26-to-v27.ts` | ~150 | Migrates freeform-path masks from JSON-string form to `pathVertices: MaskVertex[]`. |
| `apps/web/src/services/storage/migrations/transformers/v27-to-v28.ts` | ~250 | Migrates time fields with `roundMediaTime()` (rounds to tick precision) and migrates animation keyframe `time`/`dt` fields. |
| `apps/web/src/services/storage/migrations/transformers/v28-to-v29.ts` | 227 | Flattens `transform.position.x/y`, `opacity`, `blendMode`, `volume`, `muted`, text params into a single `params: Record<string, primitive>` field. |
| `apps/web/src/services/storage/migrations/transformers/v29-to-v30.ts` | 139 | Migrates animation `bindings.channels` to per-property shape — flatten `{kind, components, channelId}` into per-property paths. |
| `apps/web/src/services/storage/migrations/transformers/v30-to-v31.ts` | 100 | Renames mask `type: 'custom'` → `type: 'freeform'` (down-migration can map back without a marker). |
| `apps/web/src/core/managers/project-manager.ts` | 707 | `ProjectManager` — `createNewProject`, `loadProject`, `saveCurrentProject`, `renameProject`, `deleteProjects`, `duplicateProjects`, `updateSettings`, `prepareExit`. **Contains bugs #870, #871, #873.** |
| `apps/web/src/core/managers/save-manager.ts` | 112 | `SaveManager` — debounced autosave via `setTimeout`, `pause()`/`resume()`/`flush()`. **Contains bug #870's `if (this.isSaving) return` early-return.** |
| `apps/web/src/components/providers/editor-provider.tsx` | 154 | `EditorProvider` React component — load-on-mount with `cancelled` flag, `beforeunload` listener (dialog only, no force-save). |
| `apps/web/src/app/projects/page.tsx` | 1018 | Projects list page — thin wrappers `deleteProjects({editor, ids})`, `renameProject({editor, id, name})` that just `await editor.project.{deleteProjects,renameProject}(...)` — they assume the manager throws on failure (which it doesn't, per bug #873). |

### 10.2 FreeCut (`/tmp/freecut`)

| File (path relative to repo root) | LOC | Summary |
|---|---|---|
| `src/types/project.ts` | 290 | `Project` interface with `schemaVersion?: number` (default 1), `rootFolderHandle?: FileSystemDirectoryHandle`, `thumbnailId?`/`thumbnail?`. `ProjectTimeline` interface (tracks + items + transitions + compositions + keyframes). `ProjectResolution` (width/height/fps/backgroundColor). |
| `src/types/timeline.ts` | 508 | `BaseTimelineItem`, `VideoItem`, `AudioItem`, `TextItem`, `ImageItem`, `LottieItem`, `ShapeItem`, `AdjustmentItem`, `ControllerItem`, `CompositionItem`, `SubtitleSegmentItem`. `TimelineItem` discriminated union. `TimelineTrack`, `ProjectMarker`. 10 element types vs OpenCut-classic's 7. |
| `src/infrastructure/storage/workspace-fs/projects.ts` | 337 | FS-Access API projects store: `getAllProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject`, `getDBStats`. Stashes `rootFolderHandle` to IndexedDB on write, re-attaches on read. Per-path `withKeyLock()` for index.json mutations. |
| `src/infrastructure/storage/workspace-fs/fs-primitives.ts` | 399 | `exists`, `readJson`, `readBlob`, `readArrayBuffer`, `writeJsonAtomic` (temp-file + `move()` + copy+delete fallback), `writeBlob`, `removeEntry`, `listDirectory`, `readDirectoryFiles`. `WorkspaceFileCorruptError` for corrupt JSON. `rootsRejectingMove` WeakSet caches broken roots. |
| `src/infrastructure/storage/handles-db.ts` | 276 | IndexedDB registry for `FileSystemDirectoryHandle`/`FileSystemFileHandle`. Compound key `${kind}:${id}`. Kinds: `workspace`, `media`, `project-folder`. Workspace "current" sentinel + known-workspace list pattern. Permission helpers. |
| `src/shared/projects/migrations/types.ts` | 66 | `CURRENT_SCHEMA_VERSION = 15`, `Migration` interface (`version`, `description`, `migrate`), `MigrationFn = (project: Project) => Project` (synchronous), `ProjectWarning`, `MigrationResult`. |
| `src/shared/projects/migrations/migrations.ts` | 1011 | 14 migrations (v2–v15). Big helpers for transition model conversion, linked audio companions, source-frame math. |
| `src/shared/projects/migrations/index.ts` | 121 | Two-stage architecture: `runMigrations()` (version-based, only if `schemaVersion < CURRENT`) → `normalizeProject()` (every load, applies defaults, repairs overlaps, collects warnings). |
| `src/shared/projects/migrations/normalize.ts` | (not read) | The second-stage normalizer that runs every load. |
| `src/features/project-bundle/services/bundle-export-service.ts` | 467 | `exportProjectBundle()` and `exportProjectBundleStreaming()`. Uses `fflate` Zip library. Writes `manifest.json` (with SHA-256 checksum), `project.json`, `media/{sha256}/{filename}` entries, `cover.jpg`, `animation-presets.json` sidecar. Manifest checksum verified on import. |
| `src/features/project-bundle/services/bundle-import-service.ts` | 324 | `importProjectBundle()`. Validates bundle (manifest checksum, all media present, animation presets sidecar declared). Unzips to memory. Extracts media to user-selected destination directory. Remaps `mediaId`s. Sanitizes animation presets. |
| `src/features/project-bundle/schemas/project-schema.ts` | 919 | (not read in detail) Zod schema for project bundle. |
| `src/features/project-bundle/types/bundle.ts` | (not read) | `BundleManifest`, `BundleProject`, `ExportProgress`, `ImportResult`, `ImportConflict` types. |

### 10.3 Code References — nle-engine (reference, NOT canon)

> nle-engine (github.com/bearachprema/nle-engine) is an in-between clean-room port used to de-risk implementation. It is **NOT canon**; where it conflicts with this spec, **the spec wins**. The engine's own persistence-gap audit (`gaps/audit/E2-persistence-serialization.md`) is the delta record. Full reconciliation: `19-code-references.md` (§7 answers the engine's D1/D5 decisions from this spec).

| Spec section | Engine file:line (or gaps/audit) | Verified quote | Status | Note |
|---|---|---|---|---|
| §3.1 ProjectJSON schema | `src/lib/nle/core/types.ts:1451` | `export interface Project {` | CORRECTIVE | FreeCut-shaped single-timeline container; spec's metadata/settings/scenes wins (engine D1 resolved AGAINST the spec — the C8 adapter is the convergence task, spec 19 §7) |
| §3.3 Zod validation | `src/lib/nle/headless/api.ts:2319` | `export async function normalizeProjectForHeadless(raw: unknown): Promise<Project> {` | CORRECTIVE | Presence-style normalization (now delegated, richer than the 3-field stub); full ProjectSchema wins |
| §3.3 version literal | `src/lib/nle/headless/api.ts:1737` | `schemaVersion: z.number().int().positive().optional(),` | CORRECTIVE | Optional vs z.literal(N); spec wins |
| §5.1 migration framework | `src/lib/nle/persistence/index.ts:65-67/:162-183` (Round-8 re-cite; was `gaps/audit/MASTER.md:65`) | migrate gate + normalize + warnings channel (1,174 LOC, Wave 4B) | ALIGNED-semantics / CORRECTIVE-shape | The migrate/normalize/warnings SEMANTICS match spec §5; the serialized JSON shape is engine-native v2 — the C8 adapter re-targets it to spec 09 ProjectJSON (spec 19 §7 D1) |
| §4.1/§4.4 OPFS | `gaps/audit/MASTER.md:85` (pre-4B quote) | (Wave 4B landed the module; D5 storage plane still OPEN) | PARTIAL | Storage-agnostic module exists; spec's OPFS layout + host MediaStore is the D5 answer when the engine attaches storage |
| §4 save path integrity | `src/lib/nle/headless/api.ts:2818` | `async editProject(input: NleEditInput): Promise<NleEditResult> {` | RESOLVED (was CORRECTIVE) | **The fake round-trip is RETIRED (Wave 4B)** — editProject now serializes the post-edit timeline (api.ts:1070-1130 per scout R8-B); the counter-example stays documented in spec 19 §6 |
| storage seam | `src/lib/nle/headless/api.ts:2578` | `serializeProject?: () => Project;` | ALIGNED | Optional serialize hook reserved (unwired) |
| wire shape (D1) | `src/lib/nle/headless/api.ts:1745` | `fps: z.number().int().min(1).max(240),` | CORRECTIVE | Two conflicting Project shapes in one module; spec 15's ProjectJSON answers D1 |
| §6 autosave ↔ undo | `src/lib/nle/timeline/timeline.ts:1772` | `function snapshotsEqual(a: TimelineData, b: TimelineData): boolean {` | RESOLVED (was CORRECTIVE) | **P0.6 FIXED (Wave 4A)** — equality now covers keyframes + compositions + backgroundColor (jsonDeepEqual :1798-1803); m20 20.7 regression-tested; counter-example retained in spec 19 §6 |
| §5 load normalization | `src/lib/nle/persistence/index.ts:352-387` (Round-8 re-cite; was MASTER.md:85) | hydrate: sanitize + orphan-prune + warnings (4B) | ALIGNED-semantics | The weak `restore()` path is retired; normalization now inline — shape still engine-native (C8) |
| §7.2 media persistence | `gaps/audit/E2-persistence-serialization.md:156` | `No media persistence plane` | ENGINE-GAP | Spec's MediaRecord[] answers it |
| §7.1 import probe | `src/lib/nle/headless/api.ts:2775` | `// Wave 1 stub: the real impl uses OPFS + mediabunny to decode + probe.` | CORRECTIVE | Engine probe is a stub; spec §7.1's flow is the growth path |

### 10.4 GitHub issues (kimdogyeom)

| Issue | Title | State | Body length | Source URL |
|---|---|---|---|---|
| #870 | "[BUG] Concurrent autosaves and exit can silently lose newer project changes" | open | ~2.4 KB | https://github.com/opencut-app/opencut/issues/870 |
| #871 | "[BUG] A failed storage migration permanently poisons retries and can leave saving paused" | open | ~2.0 KB | https://github.com/opencut-app/opencut/issues/871 |
| #873 | "[BUG] Project rename/delete races can lose data and report failed persistence as success" | open | ~3.6 KB | https://github.com/opencut-app/opencut/issues/873 |

All three are authored by `kimdogyeom` (GitHub user id 88586010), all opened 2026-07-23 against commit `c2e266870172312f461df75da3e7f6fbe9d2a1fc`. All three are still **open** as of the scout's fetch. Each contains "Bounded proposed fix" sections — quoted verbatim in §13 below.

---

## 11. Corrections to Seed Spec

The scout identified the following assumptions in the seed `09-project-model.md` that need correction based on the source code:

### Correction #1: Restore `TBackground` discriminated union for project background

**Seed assumption (§3.1):** `ProjectSettings.backgroundColor: ColorRGBA` (just a color).

**Source evidence:** OpenCut-classic `apps/web/src/project/types.ts:5-13` uses `TBackground = { type: 'color', color: string } | { type: 'blur', blurIntensity: number }` — a discriminated union supporting both solid color and blur-backdrop modes. FreeCut's `src/types/project.ts:285-290` uses `backgroundColor?: string // Hex color` (simple) — but FreeCut's renderer has separate blur-handling code paths.

**Correction:** Restore the discriminated union form:

```ts
interface ProjectSettings {
  // ...
  background:
    | { type: 'color'; color: ColorRGBA }
    | { type: 'blur'; blurIntensity: number };
}
```

This matches what we need for v1 (solid color) and v2 (blur-backdrop for vertical video / letterbox).

### Correction #2: We don't need a `HandlesDB` — confirm OPFS eliminates it

**Seed assumption (§4.3):** The table row "Handle persistence: OPFS = ✅ (origin-scoped, automatic)" implies no handle registry is needed.

**Source evidence:** FreeCut's `src/infrastructure/storage/handles-db.ts` (276 LOC) exists *only* because FreeCut uses the FS-Access API (user-picked folder outside OPFS). `FileSystemDirectoryHandle` instances cannot be serialized to JSON; they must be stored via IndexedDB's structured clone to survive reloads. **OPFS does not have this problem** — `navigator.storage.getDirectory()` always returns the same origin-scoped root on every call.

**Correction:** Confirm in §4.3 that we explicitly do NOT need `handles-db.ts` or any equivalent. Mention FreeCut's 276-LOC handles-db.ts as the complexity we're avoiding. Add an explicit note in §4.4's file layout that OPFS roots are auto-persistent (no side registry).

### Correction #3: FCPXML exporter — colorSpace on `<format>` (NOT `<asset>` or `<sequence>`); triplet format, not bare name

**Seed assumption (§8.13 of seed = §8.13 of this refined spec):** The FCPXML exporter (`10-fcpxml-export.md`) uses `MediaColorInfo` (per-asset) to derive the `<asset colorSpace="...">` attribute. The seed doesn't mention sequence-level colorSpace.

**Source evidence (post-SCOUT-10-RETRY):** This correction has been superseded by **two** findings from spec 10 §13 Correction #4 and Correction #7:

1. **`<asset>` has NO `colorSpace` attribute.** The FCPXML 1.10 DTD (lines 60-104) puts `colorSpace CDATA #IMPLIED` on `<format>` (line 70), and `colorSpaceOverride CDATA #IMPLIED` on `<asset>` (line 99) — "the same as the colorSpace attribute of the format element." The asset inherits its format's color space by default; per-asset overrides use `colorSpaceOverride`.

2. **`<sequence>` has NO `colorSpace` attribute either.** The DTD (lines 418-423) declares `<sequence>` with only `format IDREF #REQUIRED`, `resolution`, `role`, `configName`, `configSource`, `keywords`. The sequence references the `<format>` resource via `format="r1"`, and the `<format>` carries the project's color space. There is no separate "sequence-level colorSpace" — the format resource is the single source of truth for the project's color space.

3. **Values are triplets, not bare names.** The `colorSpace` / `colorSpaceOverride` attribute value is `"<cp>-<tc>-<mc> (<name>)"` per ISO/IEC 23001-8 (e.g., `"1-1-1 (Rec. 709)"`, `"9-16-9 (Rec. 2020 PQ)"`, `"9-18-9 (Rec. 2020 HLG)"`). The seed's bare names (`"Rec. 709"`, `"Rec. 2020"`, etc.) are invalid. `Display P3` and bare `sRGB` are NOT valid v1.10 values — `Display P3` requires FCPXML 1.11+ (fall back to `"1-1-1 (Rec. 709)"` with a runtime warning), and `sRGB` only appears as `colorSpaceOverride="sRGB IEC61966-2.1"` on still-image `<asset>` elements.

**Correction:** The FCPXML exporter should:
1. Derive the project's color space from `ProjectSettings.displayMode.primaries` + `transfer` and emit it as `colorSpace="<triplet>"` on the `<format>` resource (one per project). The `<sequence>` references this `<format>` via `format="r1"`.
2. For each `<asset>`, compare the asset's derived triplet (from `MediaColorInfo`) to the format's triplet. If they differ, emit `colorSpaceOverride="<triplet>"` on the `<asset>`. If they match, omit the attribute (asset inherits the format's color space).
3. Use triplet format exclusively. Never emit bare names like `"Rec. 709"`.
4. The corrected function pair is `formatColorSpaceTriplet(displayMode)` + `formatColorSpaceOverride(colorInfo, displayMode)` — see §8.13 of this file for the full code.

**Action item for stream 10 (FCPXML):** Already applied in spec 10 §13 Correction #4 + §13 Correction #7 (SCOUT-10-RETRY). This correction in spec 09 §8.13 is now aligned with spec 10's corrected pattern. The original "sequence-level colorSpace" framing was incorrect and has been removed.

### Correction #4: The seed's `Migration` interface should support `skipped` returns

**Seed assumption (§5.1):** The `Migration.migrate(project)` returns the migrated project directly.

**Source evidence:** OpenCut-classic's `MigrationResult<T> = {project: T, skipped: boolean, reason?: string}` (`transformers/types.ts:9-13`) lets migrations short-circuit if the data is already in the target shape. This is important for idempotency — running the same migration twice should be a no-op.

**Correction:** Adopt OpenCut-classic's `MigrationResult` shape:

```ts
interface MigrationResult<T> {
  project: T;
  skipped: boolean;
  reason?: string;
}

interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate(project: unknown): MigrationResult<unknown>;  // returns {project, skipped, reason?}
}
```

### Correction #5: Persist after each migration step, not just at the end

**Seed assumption (§5.1):** The `migrateProject()` function runs all migrations in a loop and only validates at the end. It doesn't address persistence between steps.

**Source evidence:** OpenCut-classic's runner (`runner.ts:89-101`) calls `projectsAdapter.set(projectId, result.project)` after each migration step — so a crash mid-migration leaves the project at an intermediate version, resumable on next load.

**Correction:** Our `migrateProject()` should also persist after each step if the project came from storage. Add to §5.1:

```ts
export async function migrateProject(project: unknown, opts?: { persistStep?: (p: unknown) => Promise<void> }): Promise<ProjectJSON> {
  let current = project;
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations.find(m => m.fromVersion === current.schemaVersion);
    if (!migration) throw new Error(`No migration from version ${current.schemaVersion}`);
    const result = migration.migrate(current);
    if (result.skipped) break;
    current = result.project;
    if (opts?.persistStep) await opts.persistStep(current);  // persist intermediate
  }
  return ProjectSchema.parse(current);
}
```

### Correction #6: Add `commitTmpFile` fallback to `OPFSStorage.saveProject` for cross-browser future

**Seed assumption (§4.1):** Uses `tempHandle.move(\`${id}.json\`)` for atomic rename. No fallback.

**Source evidence:** FreeCut's `fs-primitives.ts:196-234` (`commitTmpFile`) prefers `move()` but falls back to copy+delete if `move()` rejects with `NotSupportedError`. While OPFS supports `move()` on Chromium 111+, Firefox and Safari do NOT support `move()` even on OPFS (verified — see §8.10). Our v1 is Chromium-only, but adding the fallback costs ~20 lines and buys forward-compat.

**Correction:** Add to `OPFSStorage.saveProject()`:

```ts
async saveProject(id: string, data: ProjectJSON): Promise<void> {
  const dir = await this.root.getDirectoryHandle('projects', { create: true });
  const tmpHandle = await dir.getFileHandle(`${id}.json.tmp`, { create: true });
  const writable = await tmpHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();

  // Atomic rename (Chromium 111+) or copy+delete fallback (Safari/Firefox)
  try {
    await tmpHandle.move(`${id}.json`);
  } catch (e) {
    if (e.name === 'NotSupportedError') {
      const targetHandle = await dir.getFileHandle(`${id}.json`, { create: true });
      const tw = await targetHandle.createWritable();
      await tw.write(JSON.stringify(data, null, 2));
      await tw.close();
      await dir.removeEntry(`${id}.json.tmp`);
    } else {
      throw e;
    }
  }
}
```

### Correction #7: Add `withKeyLock` for per-path write serialization

**Seed assumption (§4.1, §6.2):** Uses `withProjectLock` per project, but no per-path file lock in `OPFSStorage`.

**Source evidence:** FreeCut's `fs-primitives.ts:158-256` uses `withKeyLock(writeJsonAtomicLockKey(segments), fn)` to serialize writes to the same path. Without this, two concurrent `saveProject(idA, ...)` calls can race on the temp file's `createWritable()` — Chromium throws `NoModificationAllowedError` on the loser. The seed's `withProjectLock` (§6.2) handles the higher-level race, but two concurrent `saveProject` calls to the *same* project ID would still race at the file level if our `withProjectLock` is bypassed (e.g., a direct call from a different code path).

**Correction:** Port `withKeyLock` from FreeCut and use it inside `OPFSStorage.saveProject` and `OPFSStorage.saveMedia`. This is a defense-in-depth layer.

### Correction #8: Don't swallow errors in `saveCurrentProject`/`renameProject`/`deleteProjects`

**Seed assumption (§6.2):** The seed's `ProjectManager.renameProject` and `deleteProject` use `withProjectLock` but don't address error propagation explicitly.

**Source evidence:** OpenCut-classic's `project-manager.ts:189-210` (saveCurrentProject), `318-358` (renameProject), and `276-308` (deleteProjects) ALL swallow errors via `try/catch + console.error`. The seed's `withProjectLock` prevents the race, but if we copy OpenCut-classic's `try/catch` pattern, we'll re-introduce bug #873 (failed persistence reported as success).

**Correction:** Explicitly state in §6.2 that `save`/`rename`/`delete` MUST re-throw errors. Example:

```ts
async save(): Promise<void> {
  return this.withProjectLock(this.currentProjectId, async () => {
    try {
      const project = this.serializeCurrentState();
      await this.storage.saveProject(project.metadata.id, project);
      // ... update internal state
    } catch (e) {
      // DO NOT swallow — re-throw so the UI can show the error.
      throw e;
    }
  });
}
```

The `withProjectLock` already handles the "previous failed" case via `existing.then(fn, fn)` — it runs `fn` even if the previous operation failed.

### Correction #9: `DisplayMode.toneMap` is preview-only, not exported

**Seed assumption (§8.13 of seed = §8.13 of this refined spec):** Doesn't explicitly say whether `toneMap` flows to FCPXML.

**Source evidence:** FCPXML 1.10 has no concept of preview tonemapping. The downstream NLE handles HDR→SDR tonemapping in its own pipeline. Carrying `toneMap` into FCPXML would be meaningless.

**Correction:** Add explicit note in §3.1 that `DisplayMode.toneMap` is preview-only — used by our renderer's output transfer function when the canvas colorSpace is SDR but the source is HDR. Not part of the WYSIWYG contract for FCPXML export (only `MediaColorInfo` is). Already implied by §8.13 point 5 above.

### Correction #10: Use `schemaVersion` literal in Zod, not `version: number`

**Seed assumption (§3.3):** Uses `z.literal(1)` for `schemaVersion`. ✅ Already correct in the seed.

**Source evidence:** OpenCut-classic's `TProject.version: number` (`project/types.ts:49`) is untyped. Their migration runner has to inspect project shape to detect v0 vs v1 (see `runner.ts:125-141` `getProjectVersion`). Our `z.literal(1)` is strictly better — Zod rejects any other version at parse time.

**Correction:** No change needed. But add a note in §5.1 confirming this — and that future v2 schema uses `z.literal(2)` etc., with migration validating each version's literal.

### Correction #11: Add `MAX_SCHEMA_VERSION` ceiling check

**Seed assumption (§5.1):** The migration loop checks `current.schemaVersion < CURRENT_SCHEMA_VERSION`. If a project's schemaVersion is *higher* than CURRENT (e.g., user downgrades the app), the loop exits without error — and then `ProjectSchema.parse(current)` (which expects `z.literal(1)`) rejects.

**Source evidence:** OpenCut-classic's `runner.ts:67-69` has `if (currentVersion >= targetVersion) continue;` — same skip behavior. They don't error on "future version" because their `ProjectSchema` (implicit, no Zod) accepts any shape.

**Correction:** Add an explicit ceiling check in `migrateProject()`:

```ts
export function migrateProject(project: unknown): ProjectJSON {
  let current = project as { schemaVersion?: number };
  if (current.schemaVersion !== undefined && current.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Project schemaVersion ${current.schemaVersion} is newer than current ${CURRENT_SCHEMA_VERSION}. Cannot downgrade.`);
  }
  // ... rest of migration
}
```

This produces a clear error message instead of a confusing Zod parse error.

---

## 12. OpenCut-classic Migration Summary

All 31 migrations in `/tmp/opencut-classic/apps/web/src/services/storage/migrations/transformers/v{N}-to-v{N+1}.ts`. Sorted ascending by source version.

| # | File | Lines | What it does |
|---|---|---|---|
| 1 | `v0-to-v1.ts` | 67 | Add a default `Main scene` with a fresh UUID and ISO timestamps. Skip if `scenes` array already exists. |
| 2 | `v1-to-v2.ts` | 262 | Major refactor: add `transform`/`opacity` on every element, `settings.background` discriminated union (color\|blur), default canvasSize `{1920×1080}`, default fps `30`. Frozen v2-era defaults at top. |
| 3 | `v2-to-v3.ts` | 84 | Add `metadata.duration` computed as `max(startTime + duration)` across the main scene's elements. |
| 4 | `v3-to-v4.ts` | ~200 | Normalize text `fontWeight` from `'normal'/'bold'` to `'400'/'700'` numeric strings. Validate against `VALID_NUMERIC_FONT_WEIGHTS` set. |
| 5 | `v4-to-v5.ts` | ~150 | Migrate legacy `sticker` elements: normalize `stickerId` from known providers (icons/emoji/flags/shapes), drop unknown stickers. |
| 6 | `v5-to-v6.ts` | ~100 | Migrate `scene.bookmarks` from bare-number form to `{time: number}` object form (preserves `note`/`color`/`duration` if present). |
| 7 | `v6-to-v7.ts` | ~150 | Migrate text elements' content/typography fields (fontFamily, fontSize, fontWeight, color, alignment, background). |
| 8 | `v7-to-v8.ts` | ~150 | Add `shape`/`params` fields to elements; backfill defaults. |
| 9 | `v8-to-v9.ts` | ~150 | Migrate text element typography fields (additional standardization pass). |
| 10 | `v9-to-v10.ts` | 21 | Pure version bump: `{ ...project, version: 10 }` — no field changes. Used to mark a clean schema boundary. |
| 11 | `v10-to-v11.ts` | ~150 | Migrate `transform.scale` from `{x, y}` to flat `scaleX`/`scaleY`. |
| 12 | `v11-to-v12.ts` | ~200 | Migrate `transform.position` to flat `positionX`/`positionY` with keyframe interpolation logic. |
| 13 | `v12-to-v13.ts` | ~200 | Add `masks` field to maskable elements (video/image/graphic). |
| 14 | `v13-to-v14.ts` | ~250 | Split `masks` into separate mask + stroke structures (strokeAlign, strokeColor, strokeWidth, etc.). |
| 15 | `v14-to-v15.ts` | ~100 | Backfill `intrinsicWidth`/`intrinsicHeight` on sticker elements (fallback `STICKER_INTRINSIC_SIZE_FALLBACK = 200`). |
| 16 | `v15-to-v16.ts` | ~100 | Rename `sticker` tracks → `graphic` tracks (terminology change). |
| 17 | `v16-to-v17.ts` | ~100 | Backfill `strokeAlign` on mask stroke params (was missing in some legacy entries). |
| 18 | `v17-to-v18.ts` | ~150 | Migrate `volume` from linear gain (0..1) to dB via `linearGainToDb()`, clamped to `[-60, +20]`. |
| 19 | `v18-to-v19.ts` | ~50 | Add `lastCustomCanvasSize` and `originalCanvasSize` to project settings. |
| 20 | `v19-to-v20.ts` | ~100 | Add `isSourceAudioEnabled` (default true) to video elements — toggles embedded audio for unlink workflows. |
| 21 | `v20-to-v21.ts` | ~100 | Rescale `background.blurIntensity` from legacy scale (50) to new scale via `INTENSITY_TO_SIGMA_DIVISOR = 5`. |
| 22 | `v21-to-v22.ts` | ~300 | Major: parse legacy CSS color strings via `culori` library → convert to linear RGBA. Migrate legacy animation keyframes (scalar/discrete/vector/color channels) to new schema. |
| 23 | `v22-to-v23.ts` | 340 | **MOST IMPORTANT.** Convert all time fields from seconds (floats) to integer ticks at `TICKS_PER_SECOND = 120_000`. Migrate `fps` from bare `number` to rational `{numerator, denominator}` using GCD. Matches our `MediaTime`/`FrameRate` design. |
| 24 | `v23-to-v24.ts` | ~150 | Restructure `tracks` from a flat array to `{overlay: OverlayTrack[], main: VideoTrack, audio: AudioTrack[]}` SceneTracks shape — matches our `SceneTracksJSON`. |
| 25 | `v24-to-v25.ts` | ~150 | Migrate `transform.position` animation channel IDs from `transform.position:x/y` to `transform.positionX/Y:value`. |
| 26 | `v25-to-v26.ts` | 130 | Repair v24→v25 bug: that migration spread a flat array into a numeric-keyed object instead of a proper `{overlay, main, audio}` object. This migration reconstructs the proper shape via `Object.values()`. |
| 27 | `v26-to-v27.ts` | ~150 | Migrate freeform-path masks from JSON-string form (`path: '{"points":[...]}'`) to native `pathVertices: MaskVertex[]` array. |
| 28 | `v27-to-v28.ts` | ~250 | Apply `roundMediaTime()` (round to tick precision) to all time fields including animation keyframe `time`/`dt`. |
| 29 | `v28-to-v29.ts` | 227 | Flatten `transform.position.x/y`, `opacity`, `blendMode`, `volume`, `muted`, text params into a single `params: Record<string, primitive>` field on each element. |
| 30 | `v29-to-v30.ts` | 139 | Migrate animation `bindings.channels` to per-property shape — flatten `{kind, components, channelId}` into per-property paths keyed on `binding.path`. |
| 31 | `v30-to-v31.ts` | 100 | Rename mask `type: 'custom'` → `type: 'freeform'` (down-migration can map back without a marker since `'freeform'` is unique to v31+). |

**Summary stats:**
- Total migrations: 31 (v0→v1 through v30→v31)
- Major migrations (≥200 LOC): v1→v2 (262), v21→v22 (~300), v22→v23 (340) — three big-bang refactors.
- Pure version-bump migrations (no field changes, just a version bump for marking a clean boundary): v9→v10.
- Bug-fix migrations (exist solely to repair damage from a previous migration): v25→v26 (fixes v24→v25's object-spread bug). Lesson: **migrations can themselves have bugs**, and we should plan for migration-fix migrations.
- Time/precision migrations: v22→v23 (seconds→ticks), v27→v28 (round to tick precision), v17→v18 (linear→dB). Three migrations dealing with numeric precision — exactly the kind of issue our `MediaTime` branded integer type avoids from day 1.
- Terminology-rename migrations: v15→v16 (sticker→graphic track), v30→v31 (custom→freeform mask). Two — small but always needed.
- Migration policy (`AGENTS.md`): "Migrations are additive only. Do not delete, rename, or replace persisted data in a migration. When a new storage shape is needed, add the new fields alongside the old fields." — This is the OpenCut-classic convention. FreeCut takes the opposite approach (replace-in-place + normalization on every load). **Our spec adopts FreeCut's approach** (smaller migration count, normalization does the heavy lifting).

---

## 13. kimdogyeom Bug Hardening Checklist

For each of the three OpenCut persistence bugs, the specific code pattern in OpenCut-classic that causes it, the location of that pattern in the source, and the corresponding pattern in our spec that prevents it.

### Bug #870 — Concurrent autosaves and exit can silently lose newer project changes

**Source:** https://github.com/opencut-app/opencut/issues/870

**Verbatim quote from the issue (Current Behavior section):**

> Project persistence is not ordered, and an older captured snapshot can overwrite or republish over newer active state.
>
> On current `dev`:
>
> - `SaveManager.saveNow()` returns immediately when `isSaving` is true, so `flush()` does not necessarily await the in-flight save.
> - `ProjectManager.saveCurrentProject()` captures `this.active` plus scenes before awaiting `storageService.saveProject()`, then unconditionally assigns that captured `updatedProject` back to `this.active` and metadata after the await.
> - `saveCurrentProject()` catches and logs storage failures without rethrowing, while `SaveManager` has already cleared `hasPendingSave`.
> - `editor-header.tsx::handleExit()` closes and routes in `finally`, including after `prepareExit()` fails.
>
> A settings, scene, timeline, thumbnail, or view mutation made while save A is pending can therefore be absent from A, overwritten in memory when A completes, or treated as clean after a failed write. Exit can close before the newest generation is durable.

**Root-cause patterns in OpenCut-classic source:**

| Pattern | File:Line | Why it causes #870 |
|---|---|---|
| `saveNow()` returns early if `isSaving` is true | `apps/web/src/core/managers/save-manager.ts:85` `if (this.isSaving) return;` | Mid-flight mutations never trigger a follow-up save because the early return path doesn't re-arm the timer. |
| `hasPendingSave = false` set BEFORE the await | `save-manager.ts:94` `this.hasPendingSave = false;` | A `markDirty()` arriving during the await sets it back to `true`, but a mutation arriving between `false` and `await` then re-cleared by `markDirty()` after save resolves is lost. |
| `saveCurrentProject()` captures `this.active` before await | `project-manager.ts:194-202` | The captured `updatedProject` is a stale snapshot. |
| `saveCurrentProject()` overwrites `this.active` after await | `project-manager.ts:205` `this.active = updatedProject;` | Mutations made during the await (in `this.active`) are lost — overwritten by the stale snapshot. |
| `saveCurrentProject()` swallows errors | `project-manager.ts:207-209` `catch (error) { console.error("Failed to save project:", error); }` | Caller's `await` resolves normally; UI shows no error; `SaveManager` thinks the save succeeded. |
| `prepareExit()` doesn't block exit on failure | `project-manager.ts:534-545` and `editor-header.tsx` `handleExit()` `finally` clause | Exit routes the user away even if the latest changes weren't saved. |

**Our hardening patterns (seed spec §6.1, §6.3, plus corrections in §11):**

1. **Generational save with `pendingSave` flag (seed §6.1).** Our `ProjectManager.save()` sets `pendingSave = true` instead of returning early when `isSaving` is true. After the await completes, the `finally` block checks `pendingSave` and re-runs `save()` if true. This guarantees the latest state is always eventually persisted.

2. **Re-capture snapshot at write time, not at call time.** Our `serializeCurrentState()` is called *inside* the `withProjectLock` critical section, immediately before the storage write — not captured before the await. This ensures the persisted snapshot reflects the most recent state, not the state when `save()` was first called.

3. **Generation counter for in-flight save tokens.** Each save gets a monotonically-incrementing generation number. After the await, before writing `this.active`, check if the current generation is still the latest. If not (a newer save has started), skip the active-state update — the newer save will write it.

   ```ts
   class ProjectManager {
     private saveGeneration = 0;

     async save(): Promise<void> {
       const myGeneration = ++this.saveGeneration;
       return this.withProjectLock(this.currentProjectId, async () => {
         const project = this.serializeCurrentState();
         await this.storage.saveProject(project.metadata.id, project);
         // Only update active state if no newer save has started.
         if (this.saveGeneration === myGeneration) {
           this.active = project;  // save-owned fields only: duration, updatedAt
         }
       });
     }
   }
   ```

4. **Errors propagate (Correction #8).** `save()` re-throws storage errors. The caller (UI or `prepareExit`) can show a toast or block exit.

5. **`prepareExit()` blocks exit on failure.** Our `prepareExit()` awaits `save()` and re-throws — the UI's exit handler must NOT route away if `prepareExit()` rejects. This addresses the `editor-header.tsx::handleExit()` bug.

6. **`beforeunload` triggers `navigator.locks.request('project-save', ...)`.** Per seed §6.3 — uses the Web Locks API for cross-tab serialization, with `visibilitychange` as a fallback trigger. The lock's held-promise must resolve only after `save()` resolves or rejects.

### Bug #871 — A failed storage migration permanently poisons retries and can leave saving paused

**Source:** https://github.com/opencut-app/opencut/issues/871

**Verbatim quote from the issue (Current Behavior section):**

> A transient storage migration rejection is cached permanently at two layers, so later project loads cannot retry successfully.
>
> On current `dev`:
>
> - `ProjectManager.ensureStorageMigrations()` stores `storageMigrationPromise` and never clears it when `runStorageMigrations()` rejects.
> - `StorageService.ensureMigrations()` likewise retains a rejected `migrationsPromise`.
> - `ProjectManager.loadProject()` calls `editor.save.pause()` and awaits `ensureStorageMigrations()` *before* entering its `try/finally`. If migration rejects, the `finally` that resets `isLoading`, notifies, and calls `editor.save.resume()` is skipped.
> - Subsequent `loadProject()`/`loadAllProjects()` calls await the same rejected promise rather than rerunning the migration.
>
> After one transient IndexedDB/OPFS migration failure, project loading can remain poisoned for the manager lifetime and autosave can remain paused.

**Root-cause patterns in OpenCut-classic source:**

| Pattern | File:Line | Why it causes #871 |
|---|---|---|
| `ProjectManager.ensureStorageMigrations()` caches rejected promise | `apps/web/src/core/managers/project-manager.ts:64-67` `if (this.storageMigrationPromise) { await this.storageMigrationPromise; return; }` | Once the promise rejects, every subsequent caller re-awaits the same rejection. The cache is never cleared. |
| `StorageService.ensureMigrations()` caches rejected promise | `apps/web/src/services/storage/service.ts:82-85` `if (this.migrationsPromise) { await this.migrationsPromise; return; }` | Same pattern, separate cache. Two layers of poison. |
| `loadProject()` awaits migration OUTSIDE try/finally | `project-manager.ts:128-187` — `await this.ensureStorageMigrations()` is at line 135, BEFORE the `try { ... } finally { ... editor.save.resume(); }` block at lines 139-186 | If migration rejects, `finally` never runs. `isLoading` stays `true`, `editor.save` stays paused. |
| `SaveManager.isPaused` not reset on migration failure | Indirect — `SaveManager.pause()` (line 49) sets `isPaused = true`. If `loadProject()` never reaches `resume()` in `finally`, autosave stays paused forever. | |

**Our hardening patterns (seed spec §5.3, plus corrections in §11):**

1. **Clear migration promise on rejection (seed §5.3).** The seed's `ProjectManager.ensureMigrations()` explicitly catches and clears:

   ```ts
   async ensureMigrations(): Promise<void> {
     if (this.migrationPromise) {
       try {
         await this.migrationPromise;
       } catch (e) {
         this.migrationPromise = null;  // clear poison
         throw e;
       }
       return;
     }
     this.migrationPromise = this.runMigrations();
     try {
       await this.migrationPromise;
     } finally {
       this.migrationPromise = null;  // always clear after completion
     }
   }
   ```

2. **Migration await INSIDE try/finally.** Our `loadProject()` (modeled on the seed's §6 pattern) puts the migration await inside the try block:

   ```ts
   async loadProject(id: string): Promise<void> {
     this.isLoading = true;
     this.notify();
     this.editor.save.pause();
     try {
       await this.ensureMigrations();  // <-- inside try
       const project = await this.storage.loadProject(id);
       // ... rest
     } finally {
       this.isLoading = false;
       this.notify();
       this.editor.save.resume();  // <-- always runs
     }
   }
   ```

3. **Two-layer identity-safe cleanup.** Both `ProjectManager.ensureStorageMigrations()` and `StorageService.ensureMigrations()` clear the promise on rejection, but they check identity (`if (this.migrationPromise === currentPromise)`) before clearing — protects against concurrent callers. (Adopted from kimdogyeom's "Bounded proposed fix" in the issue body.)

4. **Don't clear media/scenes on migration failure.** Per kimdogyeom's "Expected Behavior": "Failed initialization should not clear the currently loaded media/scenes or partially publish project state." Our `loadProject()` only clears `editor.media.clearAllAssets()` and `editor.scenes.clearScenes()` AFTER migration succeeds, not before.

5. **Test (Test #13 above).** Explicit test: migration rejects → second call re-runs migration → if succeeds, cached thereafter.

### Bug #873 — Project rename/delete races can lose data and report failed persistence as success

**Source:** https://github.com/opencut-app/opencut/issues/873

**Verbatim quote from the issue (Current Behavior section, abridged):**

> Project rename and deletion are not ordered with autosave or with each other, and their public methods do not expose failures to callers.
>
> Current `dev` evidence:
>
> - `SaveManager.saveNow()` calls `ProjectManager.saveCurrentProject()` while tracking only a process-wide `isSaving` flag (`apps/web/src/core/managers/save-manager.ts`).
> - `ProjectManager.saveCurrentProject()` snapshots `this.active`, awaits `storageService.saveProject({ project: updatedProject })`, then assigns that captured snapshot back to `this.active` and metadata (`project-manager.ts`, `saveCurrentProject`).
> - `ProjectManager.renameProject()` independently reloads the project, changes `name`/`updatedAt`, saves it, and then publishes it (`project-manager.ts`, `renameProject`). There is no shared per-project fence or generation/currentness check between these operations.
> - `ProjectManager.deleteProjects()` runs `storageService.deleteProjectMedia()` and `storageService.deleteProject()` concurrently for each ID with `Promise.all`. A failure can therefore leave either the project record or its media behind without a deterministic phase result.
> - Both `renameProject()` and `deleteProjects()` catch persistence errors internally and resolve `Promise<void>`. Consequently, `apps/web/src/app/projects/page.tsx` clears selection and closes delete/rename dialogs after an unsuccessful operation. `apps/web/src/components/editor/editor-header.tsx` can also route to `/projects` after a failed active-project deletion because its `catch` never receives the swallowed error.
>
> A delayed pre-rename autosave can overwrite and republish the old name after rename reports success. A delete can remove the record while media deletion fails (or remove media while record deletion fails), while the UI cannot distinguish confirmed deletions from failures.

**Root-cause patterns in OpenCut-classic source:**

| Pattern | File:Line | Why it causes #873 |
|---|---|---|
| No per-project mutex between save/rename/delete | `project-manager.ts:189-210` (save), `318-358` (rename), `276-308` (delete) — all directly call `storageService.*` with no shared lock | A pre-rename autosave (delayed) can complete after the rename, overwriting the new name with the old. |
| `renameProject()` loads fresh + saves, ignoring in-memory `this.active` | `project-manager.ts:326-343` | If the active project is the one being renamed, and `this.active` has unsaved mutations, those mutations are NOT included in the rename's save. The rename's save (without mutations) overwrites the previous save (with mutations). |
| `renameProject()` overwrites `this.active` with the renamed snapshot | `project-manager.ts:345-348` `if (this.active?.metadata.id === id) { this.active = updatedProject; }` | Same pattern as bug #870: stale snapshot overwrites newer state. |
| `renameProject()` swallows errors | `project-manager.ts:351-357` `catch (error) { console.error(...); toast.error(...); }` — no rethrow | Caller `app/projects/page.tsx:381-391` `renameProject({editor, id, name})` awaits this method, sees a resolved promise, closes the rename dialog. The user thinks it succeeded. |
| `deleteProjects()` runs `deleteProjectMedia` + `deleteProject` concurrently per ID | `project-manager.ts:281-287` `Promise.all(uniqueIds.map((id) => Promise.all([deleteProjectMedia, deleteProject])))` | If `deleteProjectMedia` fails and `deleteProject` succeeds, you orphan the media. The reverse orphans the record. |
| `deleteProjects()` swallows errors | `project-manager.ts:305-307` `catch (error) { console.error(...); }` — no rethrow | Caller `app/projects/page.tsx:361-369` `deleteProjects({editor, ids})` sees a resolved promise, clears selection. |
| `editor-header.tsx::handleExit()` routes away in `finally` after delete | (referenced in issue body) | If the active project was just deleted and the delete failed silently, the user routes to `/projects` thinking the project is gone — but the record still exists in storage. |

**Our hardening patterns (seed spec §6.2, plus corrections in §11):**

1. **`withProjectLock(projectId, fn)` per-project mutex (seed §6.2).** All save/rename/delete operations on the same project ID are serialized. The lock chain is built via `existing.then(fn, fn)` — runs `fn` even if the previous operation failed (so a failed save doesn't block a subsequent rename).

   ```ts
   async withProjectLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
     const existing = this.projectLocks.get(projectId) ?? Promise.resolve();
     const next = existing.then(fn, fn);
     this.projectLocks.set(projectId, next);
     try {
       return await next;
     } finally {
       if (this.projectLocks.get(projectId) === next) {
         this.projectLocks.delete(projectId);
       }
     }
   }
   ```

   This is the single most important fix for #873. It's a stronger guarantee than the `isSaving` boolean flag in OpenCut-classic.

2. **`renameProject()` reuses the active project, doesn't reload fresh (when active).** Our `renameProject()`:

   ```ts
   async renameProject(id: string, newName: string): Promise<void> {
     return this.withProjectLock(id, async () => {
       // Drain any in-flight save first (the lock already does this).
       const source = (this.active?.metadata.id === id)
         ? this.active                                  // use in-memory state
         : await this.storage.loadProject(id);          // load fresh if not active
       if (!source) throw new Error(`Project not found: ${id}`);
       const renamed: ProjectJSON = {
         ...source,
         metadata: { ...source.metadata, name: newName, updatedAt: new Date().toISOString() },
       };
       await this.storage.saveProject(id, renamed);
       if (this.active?.metadata.id === id) {
         // Only update name + updatedAt in active; preserve any in-memory mutations.
         this.active = {
           ...this.active,
           metadata: { ...this.active.metadata, name: newName, updatedAt: renamed.metadata.updatedAt },
         };
       }
     });
   }
   ```

   This avoids the stale-snapshot overwrite bug AND avoids the "rename loses unsaved mutations" bug.

3. **Delete in deterministic order: media bytes → media metadata → project record.** Our `deleteProject(id)`:

   ```ts
   async deleteProject(id: string): Promise<DeleteResult> {
     return this.withProjectLock(id, async () => {
       // Cancel any pending save for this project.
       this.cancelPendingSave(id);

       // Phase 1: delete media bytes (per mediaId) — order within project.
       const mediaIds = await this.storage.listProjectMedia(id);
       const mediaFailures: string[] = [];
       for (const mediaId of mediaIds) {
         try { await this.storage.deleteMedia(mediaId); }
         catch (e) { mediaFailures.push(mediaId); }
       }

       // Phase 2: delete media metadata.
       try { await this.storage.deleteProjectMediaMetadata(id); }
       catch (e) { /* record phase failure */ }

       // Phase 3: delete project record (always attempt, even if phases 1-2 failed).
       let recordDeleted = false;
       try { await this.storage.deleteProject(id); recordDeleted = true; }
       catch (e) { /* record phase failure */ }

       // Phase 4: tombstone — prevent late saves from recreating the record.
       if (recordDeleted) this.tombstoneProject(id);

       return { projectId: id, mediaFailures, recordDeleted };
     });
   }
   ```

   This produces a `DeleteResult` per ID — caller (`app/projects/page.tsx`) can show per-ID partial-failure UI.

4. **Tombstone after delete (prevents late saves from recreating).** A `Set<string>` of deleted project IDs. Any in-flight save to a tombstoned ID is a no-op. This prevents the "race another autosave and recreate a deleted project" scenario the issue calls out.

5. **Errors propagate (Correction #8).** Both `renameProject()` and `deleteProject()` re-throw. Caller's `await` rejects → UI shows error → dialog stays open.

6. **Tests (Test #14 and Test #15 above).** Explicit tests for the concurrent-save-plus-rename race and the partial-delete phase-failure case.

---

## 14. Summary of Notable Findings

The scout's notable findings, in priority order for the implementation team:

1. **The three kimdogyeom bugs are real, current, and unmitigated in OpenCut-classic.** All three issues are still **open** as of the scout's fetch (2026-07-23 creation date, no fix commits visible). The proposed fixes in the issue bodies align with the seed spec's `withProjectLock` + generation-counter approach. **Action:** adopt the seed's §6.1, §6.2, §6.3 patterns and the corrections in §11 — these are the hardening checklist.

2. **OpenCut-classic's `ensureMigrations()` poison-cache is in TWO places** (`StorageService.ensureMigrations()` at `service.ts:81-91` AND `ProjectManager.ensureStorageMigrations()` at `project-manager.ts:63-80`). The seed spec only addresses one layer. **Action:** fix both, or — better — only have ONE migration entry point (the `StorageService` layer). Our spec puts migration in `ProjectManager`, so we should drop the duplicate layer.

3. **OpenCut-classic's migration framework is well-architected** despite the bugs: `ProjectRecord = Record<string, unknown>` (loose), per-step persistence, `MigrationResult.skipped` flag, additive-only policy, two-layer (wrapper + transformer) file structure. **Action:** adopt the framework structure; reject the bug-prone `ensureMigrations()` caching pattern.

4. **The v22-to-v23 migration (seconds→ticks, fps→rational)** is exactly the design our spec adopts from day 1. By using `MediaTime` (branded integer ticks) and rational `FrameRate` from the start, **we never need this migration.** This is a one-time win of ~340 LOC avoided. Lesson: pick the right primitives early.

5. **FreeCut's two-stage migration architecture** (version-based migrations + per-load normalization) is cleaner than OpenCut-classic's pure-migration approach. **Action:** adopt FreeCut's `normalize.ts` pattern for every-load repairs (e.g., overlapping items, missing `type` fields). This will reduce our migration count significantly.

6. **FreeCut's `writeJsonAtomic` pattern** (`fs-primitives.ts:236-257`) — temp file + `move()` + copy+delete fallback — is the correct atomic-write pattern. The seed spec's §4.1 only has the `move()` path; **Action:** add the fallback per Correction #6.

7. **OPFS `move()` is Chromium-only.** Verified. Our browser matrix is Chromium 113+, so this is fine for v1. If we expand to Safari/Firefox, we need the copy+delete fallback (already in Correction #6).

8. **OpenCut-classic's `OPFSAdapter` uses `createWritable()` + write + close (no temp file) for media writes.** This is fine for media (immutable blobs) but unsafe for project JSON (mutable, frequently rewritten). **Action:** use temp+rename for project JSON; use direct write for media.

9. **OpenCut-classic's project thumbnail is a base64 PNG data URL stored inside `metadata.thumbnail`.** This bloats the JSON and re-encodes on every save. **Action:** use our `thumbnailId?: string` pattern (store thumbnail as a file in `thumbnails/{project-id}.jpg`, reference by ID).

10. **FCPXML exporter emits `colorSpace` on `<format>`, not `<asset>` or `<sequence>`** (post-SCOUT-10-RETRY alignment). The DTD puts `colorSpace` on `<format>`; per-asset overrides use `colorSpaceOverride` on `<asset>`; `<sequence>` has NO `colorSpace` attribute (it references the `<format>` resource). Values are triplets (`"1-1-1 (Rec. 709)"`, `"9-16-9 (Rec. 2020 PQ)"`, etc.), not bare names. `Display P3` falls back to `"1-1-1 (Rec. 709)"` with a runtime warning (v1.10 DTD limitation). **Action:** use `formatColorSpaceTriplet(displayMode)` + `formatColorSpaceOverride(colorInfo, displayMode)` (see §8.13 code). The original "sequence-level colorSpace" framing in Correction #3 was incorrect and has been replaced.

11. **FreeCut's `HandlesDB` (276 LOC) exists ONLY because of FS-Access API.** OPFS eliminates this entire layer. **Action:** explicitly call this out as a simplification win — saves ~276 LOC and removes the handle-strip-on-write / handle-restore-on-read complexity.

12. **FreeCut's `withKeyLock(key, fn)` per-path file lock** prevents the `NoModificationAllowedError` race on Chromium when two writes target the same path. **Action:** port this for our `OPFSStorage` (Correction #7).

13. **OpenCut-classic's `cancelled` flag in `editor-provider.tsx`** is the correct React-idiomatic way to handle "user navigated away during async load." **Action:** adopt verbatim.

14. **The v25-to-v26 migration exists ONLY to fix a bug in v24-to-v25.** Migrations can themselves have bugs. **Action:** plan for migration-fix migrations. Always write a test for each migration; if a migration has a bug, write a fix-up migration rather than editing the original (preserving audit history).

15. **OpenCut-classic's `deleteProjects()` uses `Promise.all` across IDs in parallel AND across media-delete + record-delete in parallel per ID.** This produces 4-way interleaved failure modes. **Action:** our `deleteProject(id)` is per-ID (sequential IDs), with ordered phases per ID. Bulk-delete maps over IDs sequentially.

---

## Testing

> See `17-test-plan.md` §4 for the per-module template, §3 for the test
> matrix, and §5 for canonical test-asset naming. Matrix row for this
> stream: "Schema validation", "Project round-trip (JSON ↔ OPFS)",
> "Migration framework", "Autosave debounce", "Concurrent-save locking",
> "Atomic write", "OPFS quota", "OPFS worker offload", "Atomic rename
> (`move()`) + copy+delete fallback", "Keyboard shortcuts for project
> lifecycle (Cmd+S/O/N/W)". EngineCommand types referenced below are
> defined in `15-wire-protocol.md` §4.3.30–33
> (`createProject` / `loadProject` / `saveProject` / `closeProject`).
> The brief test plan in §9 above remains as the *intent* list; this
> section is the *executable* contract — reviewers compare it line-by-line
> against the actual test files. The 3 kimdogyeom regression tests at
> the end of this section are **CRITICAL** (gating) — they directly test
> the bug patterns documented in §13.

### Tier 1: Pure engine tests

[Filename: `tests/unit/09-project-model/*.test.ts`]

**Schema validation (Zod):**

- `schema-parse-valid-project-succeeds` — `ProjectSchema.parse(validProject)`
  returns a typed project; `metadata.id` matches UUID v4 regex;
  `schemaVersion` equals `CURRENT_SCHEMA_VERSION`
- `schema-parse-missing-required-field-fails` — `{ scenes: [...] }` (no
  `metadata`, no `schemaVersion`) throws `ZodError` with `issue.code = 'invalid_type'`
  pointing at `metadata`
- `schema-parse-wrong-type-fails` — `metadata: { id: 123, name: "x" }` (id not
  string) throws `ZodError` with `issue.path = ['metadata', 'id']`
- `schema-parse-invalid-uuid-fails` — `metadata.id = "not-a-uuid"` throws
  `ZodError` with `issue.code = 'invalid_string'` and `issue.message`
  mentioning UUID v4
- `schema-parse-invalid-version-fails` — `schemaVersion: 99` (above current)
  throws `ZodError` (Correction #11 ceiling check; `CURRENT_SCHEMA_VERSION`)
- `schema-discriminated-union-element-types` — for each of the 6 element
  kinds (`video` / `audio` / `text` / `image` / `shape` / `adjustment`),
  a minimal valid object parses to the correct `Element` variant; cross-kind
  payloads (e.g., `{ type: 'video', text: '...' }`) reject with
  `issue.code = 'unrecognized_keys'`
- `schema-mediatime-serializes-as-integer` — `MediaTime(7_200_000)` round-trips
  through `JSON.parse(JSON.stringify(...))` as the integer `7200000`
  (branded type erases on `JSON.stringify` but `MediaTime.is()` accepts on parse)
- `schema-framerate-rational-serializes-correctly` — `FrameRate({ num: 30000,
  den: 1001 })` (29.97 NTSC) round-trips through JSON as
  `{ num: 30000, den: 1001 }`; rejects `{ num: 30000, den: 0 }` (zero
  denominator) and `{ num: "30", den: 1 }` (non-integer num)

**Round-trip and migration:**

- `project-round-trip-json-deep-equals-original` — for any `ProjectJSON`
  produced by the engine, `JSON.parse(JSON.stringify(project))` deep-equals
  the original (no field loss, no key reordering that breaks equality)
- `migration-v1-to-v2-applies-correctly` — load
  `tests/fixtures/projects/09/v1-minimal.json`, run `migrate(project, v1 → v2)`,
  assert `schemaVersion === 2` and the v2-specific
  field shape is present (e.g., new default `settings.canvas` value applied)
- `migration-noop-when-already-at-target` — `migrate(project, v2 → v2)`
  returns the project byte-identically (early-return on `from === to`)
- `migration-failure-propagates-and-clears-cache` (kimdogyeom #871
  hardening) — inject a throwing `MigrationStep`; `ensureMigrations()`
  rejects with the injected error; **the cached `migrationPromise` is
  `null` afterwards** (cleared in `finally`, not pinned to the rejection);
  a second `ensureMigrations()` call re-runs the migration and (if the
  throw is removed) succeeds
- `migration-concurrent-callers-share-one-in-flight-promise` — 5 concurrent
  `ensureMigrations()` calls on the same `ProjectManager` produce exactly
  1 underlying `runMigrations()` invocation; all 5 await the same promise
  and resolve together
- `migration-identity-safe-clear-under-race` — caller A awaits a failed
  migration; caller B starts a *second* migration while A's catch is still
  running; A's `this.migrationPromise = null` is guarded by an identity
  check (`if (this.migrationPromise === currentPromise)`) so B's in-flight
  promise is not cleared

**`withProjectLock` mutex:**

- `withprojectlock-serializes-5-concurrent-saves` — 5 concurrent
  `engine.project.save()` calls execute strictly sequentially (verified
  by recording a per-call log with timestamps; no two calls overlap)
- `withprojectlock-releases-lock-on-error-no-deadlock` — a `save()` that
  rejects (storage throws) does not leave the per-project lock pinned:
  the next `save()` call starts immediately, not blocked on a stale
  `Promise.reject`
- `withprojectlock-runs-fn-even-after-previous-failure` — the
  `existing.then(fn, fn)` chain guarantees that a *failed* save followed
  by a `renameProject()` still executes the rename (not silently skipped)
- `withprojectlock-per-project-id-isolation` — concurrent saves to two
  different project IDs (`A` and `B`) execute in parallel (no global lock);
  only same-ID operations serialize

**Autosave:**

- `autosave-debounce-coalesces-100-rapid-changes` — fire 100
  `markDirty()` calls in 1 second; after the 2-second debounce window
  elapses, exactly **1** save was issued (assertion on a `saveCount`
  spy); the persisted state matches the latest mutation, not the first
- `autosave-pending-flag-queues-second-save` — start a slow save (storage
  stub `saveProject()` blocked on a `Deferred`); fire `markDirty()` while
  the save is in flight; release the deferred; assert **2** saves occurred
  — the in-flight one with the pre-mutation snapshot, the queued one with
  the post-mutation snapshot (kimdogyeom #870 hardening)
- `autosave-paused-during-load` — `engine.project.loadProject({id})` pauses
  autosave at entry; any `markDirty()` arriving during load is *queued*
  (not dropped); on load completion, autosave resumes and the queued dirty
  flag triggers a save
- `autosave-cancel-on-delete` — `engine.project.deleteProject(id)` cancels
  any pending autosave timer for that ID; no late save fires after delete
- `autosave-tombstone-blocks-late-save` (kimdogyeom #873 hardening) —
  after `deleteProject(id)`, a stray `save()` for the same ID (e.g., a
  stale `setTimeout` callback) is a no-op (the tombstone `Set<string>`
  short-circuits before touching storage)

**Atomic write (OPFS storage layer):**

- `atomic-write-temp-then-rename-succeeds` — `OPFSStorage.saveProject(id, p)`
  creates `projects/{id}.json.tmp`, writes the full payload, then issues
  `tempHandle.move(\`${id}.json\`)`; final file exists and parses as JSON
- `atomic-write-no-partial-file-on-crash` — inject a synthetic crash
  (`throw` mid-write, after temp file creation but before `move()`);
  the target `{id}.json` is either (a) absent (first save) or (b) the
  previous-good version (subsequent save); no torn/truncated file is
  ever observable at the target path
- `atomic-write-cleans-up-temp-on-rename-failure` — if `move()` rejects
  (e.g., quota error during rename), the temp file is removed in the
  `finally` block; `listProjectFiles()` shows no orphaned `.tmp` entries
  after a failed save
- `atomic-write-rename-replaces-existing-target` — saving over an existing
  `{id}.json` atomically replaces it: a concurrent reader sees either the
  old version or the new version, never a mix; verified by interleaving
  a `loadProject(id)` between the temp write and the rename
- `atomic-write-move-works-on-chromium-111-plus` — feature-detect
  `typeof FileSystemFileHandle.prototype.move === 'function'`; on
  Chromium 111+ the `move(name)` path is taken (assert via spy)
- `atomic-write-copy-delete-fallback-for-non-chromium` — when `move()`
  is missing or rejects with `NotSupportedError`, fall back to
  `createWritable()` + write + `removeEntry(tmpName)`; assert the
  fallback was used and the final target file is intact (FreeCut
  `commitTmpFile()` pattern, §10.2 of this spec)
- `atomic-write-per-path-lock-prevents-nomodificationallowederror` — two
  concurrent `saveProject(idA, ...)` calls (bypassing `withProjectLock`,
  calling storage directly) are serialized by `withKeyLock` at the
  storage layer; the loser does not see
  `NoModificationAllowedError` from Chromium

### Tier 2: Render / integration tests

[Filename: `tests/integration/09-project-model/*.render.test.ts`]

Tier 2 for this stream is **persistence integration** (not pixel rendering —
that lives in spec 04). All Tier 2 tests run in a real Chromium 113+
browser via Playwright, against a live OPFS instance.

- `save-to-opfs-reload-page-verify-loads` — `engine.command.apply({
  type: 'saveProject' })`; `page.reload()`; assert the boot path autoloads
  the previously active project (or `engine.command.apply({ type:
  'loadProject', params: { id } })` succeeds and the loaded `SceneState`
  deep-equals the pre-reload state)
- `save-then-delete-from-opfs-load-returns-null` — `saveProject`, then
  manually `await navigator.storage.getDirectory()` → delete
  `projects/{id}.json`; `loadProject({ id })` resolves to `null` (or
  rejects with a typed `ProjectNotFoundError`, depending on §4.5
  contract); no partial state left in `this.active`
- `save-100-media-files-1gb-total-no-quota-errors` — generate 100 ×
  ~10 MB synthetic `Blob`s (deterministic seed, no decode needed);
  `media.importBlob(...)` each; assert no `QuotaExceededError` raised;
  `navigator.storage.estimate()` reports ~1 GB usage
- `save-1000-elements-perf-save-under-2s-load-under-1s` — load
  `tests/fixtures/projects/09/v1-large.json` (1000 elements, 50 tracks, 100 media
  records); `saveProject` completes in `< 2000 ms`; `loadProject` (cold,
  OPFS cache empty) completes in `< 1000 ms`. Asserted via `performance.now()`
  brackets around the call. **This is the perf gate for spec 09.**
- `opfs-worker-offloads-io-from-main-thread` — start a save of
  `v1-large.json`; during the save, issue 60 `requestAnimationFrame`s and
  measure inter-frame delta; assert `max(delta) < 16.7 ms × 2` (no
  dropped frames — file I/O is happening on the OPFS worker, not the
  main thread; spec 02 §3 OPFS worker). If save runs on main thread,
  expect ~100 ms+ jank — that's a test failure.
- `filesystemfilehandle-move-atomic-rename-chromium-111-plus` — feature
  test: `typeof FileSystemFileHandle.prototype.move === 'function'` on
  Chromium 113+ (per browser matrix); a save+immediate-rename cycle
  produces no observable intermediate state via `getFileHandle()`
  polling at 1 ms intervals
- `copy-delete-fallback-graceful-degradation` — stub
  `FileSystemFileHandle.prototype.move` to `undefined`; `saveProject`
  still succeeds via the copy+delete fallback; final file content matches
  input byte-for-byte; temp file is removed (no `.tmp` orphans)
- `autosave-on-visibilitychange-persists-state` — modify project,
  `page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  ` with `document.visibilityState = 'hidden'`; assert `saveProject` was
  called within 100 ms; reload page; assert latest state loaded
- `autosave-on-beforeunload-attempts-save-via-navigator-locks` —
  intercept `beforeunload`; assert `navigator.locks.request('project-save',
  ...)` was called (per §6.3 cross-tab lock); the lock's held-promise
  resolves only after `save()` resolves or rejects

### Tier 3: UI tests

[Filename: `tests/integration/09-project-model/*.ui.test.ts`]

Every keyboard shortcut in the project-lifecycle table (`16-keyboard-shortcuts.md`
§3.x) must have a UI test. Each test issues the shortcut via
`page.keyboard.press()`, then asserts the resulting engine state (via a
`window.__engine` debug hook or via observable UI cues) matches the
direct `engine.command.apply()` path — the **state WYSIWYG** invariant
(spec 17 §6.1).

- `keyboard-cmd-s-saves-project` — `page.keyboard.press('Meta+S')`;
  asserts `engine.command.apply({ type: 'saveProject' })` was issued
  (spy on `engine.command.apply`); then asserts the OPFS file
  `projects/{id}.json` exists and parses as valid `ProjectJSON`
- `keyboard-cmd-o-opens-project` — pre-seed OPFS with `v1-minimal.json`
  under a known ID; `page.keyboard.press('Meta+O')` opens the open-project
  dialog; select the seeded project (via testId) and press Enter; asserts
  `engine.project.active.metadata.id === seededId` and timeline renders
  the seeded scenes
- `keyboard-cmd-n-creates-new-project` — `page.keyboard.press('Meta+N')`;
  asserts `engine.command.apply({ type: 'createProject', params: { name:
  'Untitled' } })` was issued; `engine.project.active.scenes.main.elements`
  is empty; `engine.project.active.metadata.name` is `'Untitled'`
- `keyboard-cmd-w-closes-project` — `page.keyboard.press('Meta+W')`;
  if project is clean, asserts `engine.command.apply({ type: 'closeProject'
  })` issued and `engine.project.active === null`; if project is dirty,
  asserts a confirm dialog appears; pressing `Enter` issues
  `saveProject` then `closeProject`; pressing `Escape` cancels
- `page-refresh-autoloads-autosaved-project` — modify the active project
  (split an element); wait 3 seconds (debounce window); `page.reload()`;
  assert the boot path autoloads the project and the split is present
  (1 element → 2 elements)

### Property-based tests

[Filename: `tests/unit/09-project-model/*.property.test.ts`]

- `save-and-load-round-trip` —
  `fc.assert(fc.property(arbitraryProjectJSON, (project) => {
    const loaded = saveAndLoad(project);
    expect(loaded).toEqual(project);
  }), { numRuns: 1000 })`
  where `arbitraryProjectJSON` generates valid `ProjectJSON` (biased
  toward edge cases: empty scenes, single-element tracks, max-length
  names, NTSC/PAL/24/60 fps, all 6 element kinds, deep nesting)
- `schema-validation-bivalent` —
  `fc.assert(fc.property(fc.jsonObject(), (random) => {
    const result = ProjectSchema.safeParse(random);
    // Either it parses to a valid project, or it throws ZodError.
    // No silent corruption — no "valid-but-wrong" output.
    if (result.success) {
      expect(result.data).toMatchObject({ metadata: {}, scenes: {}, version: expect.any(Number) });
    } else {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  }), { numRuns: 2000 })`
- `migration-idempotency` —
  `fc.assert(fc.property(arbitraryV1ProjectJSON, (p) => {
    const oneShot = migrate(p, v1 → v3);
    const twoStep = migrate(migrate(p, v1 → v2), v2 → v3);
    expect(twoStep).toEqual(oneShot);
  }), { numRuns: 500 })`
- `mediatime-arithmetic-monoid` — for arbitrary `a, b` in `MediaTime`,
  `MediaTime.add(a, b) === MediaTime.add(b, a)` and
  `MediaTime.add(a, MediaTime.zero) === a` (commutativity + identity)
- `framerate-reduced-form` — for arbitrary `num, den`,
  `FrameRate.normalize({ num, den })` produces `gcd(num, den) === 1` and
  `value === num / den` (semantic equality preserved across reductions)
- `withprojectlock-serializes-equivalent-to-sequential` — for an
  arbitrary list of N ops `f1…fN` against the same project ID, running
  them concurrently through `withProjectLock` produces the same final
  state as running them sequentially (lock is transparent to correctness)
- `atomic-write-final-state-deterministic` — for arbitrary project JSON
  and arbitrary crash points (before temp write, mid temp write, after
  temp write before rename, after rename), the final observable state
  is either the pre-save state or the post-save state — never a mix

### Kimdogyeom bug regression tests (CRITICAL — gating)

[Filename: `tests/unit/09-project-model/kimdogyeom-870-871-873.regression.test.ts`]

These three tests directly verify the hardening patterns in §13. **A
failure here is a release blocker** — they prove the three OpenCut-classic
bugs are not reproducible in our codebase. Each test is named with the
GitHub issue number for traceability.

**Test: #870 — Concurrent autosaves don't lose newer changes**

```ts
// Regression: https://github.com/opencut-app/opencut/issues/870
// OpenCut-classic's SaveManager.saveNow() returns early if isSaving is
// true, so a mutation arriving during the in-flight save never triggers
// a follow-up save. Our pendingSave flag (§13 #1) + generation counter
// (§13 #3) prevents this.
test('concurrent autosaves preserve latest state (#870)', async () => {
  const engine = await createInteractiveEngine({ ... });
  await engine.command.apply({
    type: 'loadProject',
    params: { id: testProject.metadata.id },  // 1 element on main track
  });

  // Trigger save #1 (slow — storage stub blocks on a Deferred).
  const storageDeferred = createDeferred();
  mockStorage.blockNextSave(storageDeferred);
  const savePromise1 = engine.command.apply({ type: 'saveProject' });

  // While save #1 is in flight, mutate state.
  await engine.command.apply({
    type: 'split',
    params: { time: 5_000_000, trackIds: null },  // 1 element -> 2
  });

  // Trigger save #2 — must queue behind save #1 (not early-return).
  const savePromise2 = engine.command.apply({ type: 'saveProject' });

  // Release save #1 — its snapshot was captured BEFORE the split.
  storageDeferred.resolve();

  await Promise.all([savePromise1, savePromise2]);

  // Reload from OPFS. The split MUST be present — save #2 ran after save
  // #1, with the post-split snapshot. If save #2 was a no-op (OpenCut
  // #870), only save #1's pre-split state would be on disk.
  const loaded = await engine.command.apply({
    type: 'loadProject',
    params: { id: testProject.metadata.id },
  });
  expect(loaded.scenes[0].tracks.main.elements).toHaveLength(2); // was 1

  // Also assert: saveProject was called exactly twice (not once).
  expect(mockStorage.saveProjectCallCount).toBe(2);
});
```

**Test: #871 — Failed migration doesn't poison retries**

```ts
// Regression: https://github.com/opencut-app/opencut/issues/871
// OpenCut-classic's ProjectManager.ensureStorageMigrations() caches the
// rejected promise permanently — second call re-awaits the same
// rejection. Our ensureMigrations() clears the cache in `finally`
// (§13 #1) + uses identity-safe clear (§13 #3).
test('migration failure clears cached promise (#871)', async () => {
  const engine = await createInteractiveEngine({ ... });
  await engine.command.apply({
    type: 'loadProject',
    params: { id: oldProject.metadata.id },  // requires migration v0 -> v1
  });

  // First attempt: inject failure into the migration step.
  mockStorage.failNextMigration(new Error('synthetic OPFS quota'));
  await expect(
    engine.command.apply({
      type: 'loadProject',
      params: { id: oldProject.metadata.id },
    })
  ).rejects.toThrow('synthetic OPFS quota');

  // CRITICAL ASSERTION: the cached promise was cleared. If OpenCut #871
  // were present, this internal field would still hold a rejected promise.
  expect(engine.project.migrationPromise).toBeNull();

  // Second attempt: should RE-RUN the migration (not re-await the cached
  // rejection). Storage stub no longer fails.
  mockStorage.succeedNextMigration();
  await expect(
    engine.command.apply({
      type: 'loadProject',
      params: { id: oldProject.metadata.id },
    })
  ).resolves.toBeDefined();  // loads successfully, migration applied

  // After successful migration, promise is cached (not cleared) so the
  // next load doesn't re-run the migration.
  const callsBefore = mockStorage.runMigrationsCallCount;
  await engine.command.apply({
    type: 'loadProject',
    params: { id: oldProject.metadata.id },
  });
  expect(mockStorage.runMigrationsCallCount).toBe(callsBefore); // cached
});
```

**Test: #873 — Rename/delete races don't lose data**

```ts
// Regression: https://github.com/opencut-app/opencut/issues/873
// OpenCut-classic's renameProject() and deleteProjects() are not
// ordered with saveCurrentProject() — a delayed pre-rename autosave can
// overwrite the renamed record. Our withProjectLock(id, fn) (§13 #1)
// serializes save/rename/delete on a per-project basis.
test('rename during save waits for save (#873)', async () => {
  const engine = await createInteractiveEngine({ ... });
  await engine.command.apply({
    type: 'loadProject',
    params: { id: projectId },  // project.metadata.name === 'Old Name'
  });

  // Start a slow save (storage stub blocks on Deferred).
  const storageDeferred = createDeferred();
  mockStorage.blockNextSave(storageDeferred);
  const savePromise = engine.command.apply({ type: 'saveProject' });

  // Concurrently rename. withProjectLock must queue this behind the save.
  const renamePromise = engine.command.apply({
    type: 'renameProject',  // spec 15 §4.1 Project category (Round-7 addition; maps to engine.project.renameProject({ id, name }))
    params: { id: projectId, name: 'New Name' },
  });

  // Release the save — the save writes 'Old Name' to disk; then rename
  // runs, loads the just-saved 'Old Name' state, applies the rename,
  // saves again with 'New Name'.
  storageDeferred.resolve();
  await Promise.all([savePromise, renamePromise]);

  // Reload. The final on-disk state MUST be 'New Name'. If OpenCut #873
  // were present, the rename's save could be overwritten by the save's
  // stale 'Old Name' snapshot (assigned to this.active after the await).
  const loaded = await engine.command.apply({
    type: 'loadProject',
    params: { id: projectId },
  });
  expect(loaded.metadata.name).toBe('New Name');
});

test('delete during save waits for save then deletes (#873)', async () => {
  const engine = await createInteractiveEngine({ ... });
  await engine.command.apply({
    type: 'loadProject',
    params: { id: projectId },
  });

  // Start a slow save.
  const storageDeferred = createDeferred();
  mockStorage.blockNextSave(storageDeferred);
  const savePromise = engine.command.apply({ type: 'saveProject' });

  // Concurrently delete. withProjectLock queues delete behind save.
  const deletePromise = engine.command.apply({
    type: 'deleteProject',  // spec 15 §4.1 Project category (Round-7 addition; maps to engine.project.deleteProject({ id }))
    params: { id: projectId },
  });

  storageDeferred.resolve();
  await Promise.all([savePromise, deletePromise]);

  // CRITICAL: the project record is gone, AND no late save recreated it
  // (tombstone set blocks late saves — §13 #4).
  const loaded = await engine.command.apply({
    type: 'loadProject',
    params: { id: projectId },
  });
  expect(loaded).toBeNull();

  // Also assert: media bytes, media metadata, and project record were
  // all deleted in deterministic phase order (§13 #3).
  expect(mockStorage.deleteCallLog).toEqual([
    'deleteMedia:*',          // phase 1: media bytes
    'deleteProjectMediaMetadata',  // phase 2: media metadata
    'deleteProject',          // phase 3: project record
  ]);
});

test('rename error propagates — no silent success (#873)', async () => {
  const engine = await createInteractiveEngine({ ... });
  await engine.command.apply({
    type: 'loadProject',
    params: { id: projectId },
  });

  // Inject failure into the rename's save step.
  mockStorage.failNextSave(new Error('OPFS write rejected'));

  // CRITICAL: rename RE-THROWS (OpenCut-classic swallows with try/catch
  // + console.error). The caller's await rejects, UI dialog stays open.
  await expect(
    engine.command.apply({
      type: 'renameProject',
      params: { id: projectId, name: 'New Name' },
    })
  ).rejects.toThrow('OPFS write rejected');

  // Active in-memory state is unchanged (rename didn't apply).
  expect(engine.project.active.metadata.name).toBe('Old Name');
});
```

### Test assets

- `tests/fixtures/projects/09/v1-minimal.json` — minimal valid v1
  project: 1 scene, 1 track, 1 video element, 1 media record. ~30
  lines. Used by Tier 1 schema tests and Tier 3 `Cmd+O` test.
  (registered in spec 17 §5.3 in Round 7)
- `tests/fixtures/projects/09/v1-large.json` — stress fixture: 1000
  elements across 50 tracks, 100 media records, 10 scenes, all 6
  element kinds represented. Used by Tier 2 perf gate
  (`save-1000-elements-perf-save-under-2s-load-under-1s`) and property
  tests' edge-case sampling. ~50 KB minified.
  (registered in spec 17 §5.3 in Round 7)
- `tests/fixtures/projects/09/v0-legacy.json` — pre-v1 format (hypothetical
  future-past format used to exercise the migration framework end-to-end).
  Used by `migration-v1-to-v2-applies-correctly`, `migration-idempotency`,
  and kimdogyeom #871 test. Generated by running `migrate(v1, v1 → v0)`
  through a synthetic reverse-migration (test-only helper, never shipped).
  (registered in spec 17 §5.3 in Round 7)
- `tests/fixtures/projects/09/dirty-state.json` — project with
  `metadata.updatedAt` older than the timeline mutations, used to test
  the `Cmd+W` dirty-confirm dialog. (registered in spec 17 §5.3 in
  Round 7)
- `tests/fixtures/projects/09/ntsc-29.97.json` — project with
  `FrameRate({ num: 30000, den: 1001 })`, used by `framerate-rational`
  schema test and property test. (registered in spec 17 §5.3 in Round 7)
- `tests/fixtures/blobs/synthetic-10mb-{0..99}.bin` — 100 × 10 MB
  deterministic synthetic blobs (PRNG seeded at fixed value) for the
  OPFS quota test. Generated by a `tests/fixtures/blobs/generate.ts`
  script (not checked in — regenerated on demand; ~1 GB total).
- (Cross-spec fixtures from `17-test-plan.md` §5 are reused where
  applicable — no duplication.)

### Test commands

```bash
# Run Tier 1 tests for spec 09 (schema, migrations, locks, autosave, atomic write)
npm test -- --filter "09-project-model"

# Run Tier 2 (persistence integration) tests for spec 09
npm run test:render -- --filter "09-project-model"

# Run Tier 3 (UI keyboard) tests for spec 09
npm run test:ui -- --filter "09-project-model"

# Run all tiers for spec 09
npm run test:all -- --filter "09-project-model"

# Run property tests only (schema validation, migration idempotency, etc.)
npm run test:property -- --filter "09-project-model"

# Run ONLY the 3 kimdogyeom regression tests (gating — runs on every PR
# that touches spec 09 / project-manager.ts / storage / migrations).
npm test -- --filter "09-project-model/kimdogyeom-870-871-873"

# Regenerate the synthetic-blob test assets (run after changing the
# PRNG seed or blob count). See tests/fixtures/blobs/generate.ts.
npm run test:fixtures:regen -- --filter "09-project-model"
```

---

**End of refined spec.** Next: implementation team uses §10 (Code References), §11 (Corrections), §12 (Migration Summary), §13 (Hardening Checklist), and §14 (Summary of Findings) as the work items. The brief intent-list test plan remains in §9 (tests 13–15 are new from the scout); the **executable test contract** is the `## Testing` section above — reviewers compare it line-by-line against the actual test files. The 3 kimdogyeom regression tests (gating) are the minimum bar for declaring spec 09 "hardened" against the OpenCut-classic persistence bugs.

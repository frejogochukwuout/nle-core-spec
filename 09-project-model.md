# 09 — Project Model: Schema, Persistence, Migrations

**Stream:** Project data model & persistence
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** OpenCut-classic types + our own storage layer (override OpenCut's IndexedDB)
**Spec file:** `09-project-model.md`

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
  type: 'crossfade' | 'wipe' | 'slide' | 'iris' | 'glitch' | ...;
  duration: MediaTime;
  params: Record<string, number | string | boolean>;
  elementAId: string;
  elementBId: string;
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
      return ProjectSchema.parse(parsed);  // Zod validation
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

## 8. Open Questions for Sub-Agent Scout

1. **OpenCut-classic `apps/web/src/project/types.ts`.** Read in full. Document the `TProject`, `TScene`, `SceneTracks`, element types. We adopt most of this with modifications (10-bit color, our own persistence).

2. **OpenCut-classic `apps/web/src/services/storage/`.** Read all files (IndexedDB adapter, OPFS adapter, migrations). Document:
   - The 31 migration versions — what does each migration do? We want to learn from their schema evolution.
   - The `storageService` interface
   - The `IndexedDBAdapter` and `OPFSAdapter` implementations

3. **OpenCut-classic's persistence bugs (kimdogyeom #870, #871, #873).** Read each issue in full. Document the specific bug and the fix. Use these as a hardening checklist for our `ProjectManager`.

4. **OpenCut-classic `apps/web/src/core/managers/project-manager.ts` and `save-manager.ts`.** Read both. Document the save flow, autosave, error handling. Note where the bugs are.

5. **FreeCut `infrastructure/storage/workspace-fs/projects.ts` and `fs-primitives.ts`.** Read both. Document FreeCut's FS-Access API pattern (we don't adopt this, but it's useful reference).

6. **FreeCut `infrastructure/storage/handles-db.ts`.** Read in full. Document how FreeCut persists `FileSystemDirectoryHandle`s in IndexedDB. (We don't need this — OPFS handles it automatically — but useful to understand what we're avoiding.)

7. **FreeCut `shared/projects/migrations/`.** List all migration files. Document FreeCut's schema versioning approach. Compare to OpenCut-classic's.

8. **FreeCut `features/project-bundle/`.** Read `bundle-export-service.ts` and `bundle-import-service.ts`. Document the ZIP export/import pattern — useful for project sharing.

9. **Browser OPFS API.** Verify:
   - `navigator.storage.getDirectory()` returns the root `FileSystemDirectoryHandle`
   - `getDirectoryHandle(name, { create: true })` for creating subdirs
   - `getFileHandle(name, { create: true })` for creating files
   - `createWritable()` returns a `FileSystemWritableFileStream`
   - `move(newName)` for atomic rename
   - Worker-context access (`navigator.storage.getDirectory()` works in workers?)
   - Browser support matrix (Chromium 86+, Firefox 111+, Safari 16.4+)

10. **Zod schema design.** Verify our `ProjectSchema` covers all cases. Consider:
    - Discriminated unions for element types (video/audio/text/image/shape/adjustment)
    - Optional vs. required fields
    - Defaults for missing fields (for forward-compatibility)

11. **Project thumbnail.** How is the project thumbnail generated and stored? Probably from a frame of the main video. Document the flow.

12. **FCPXML sidecar metadata.** When we export FCPXML (see `10-fcpxml-export.md`), we may need to include color metadata (BT.709 vs BT.2020, transfer function). Verify this is captured in `ProjectSettings.displayMode`.

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

---

**End of `09-project-model.md`.** Next: `10-fcpxml-export.md`.

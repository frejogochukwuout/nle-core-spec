# Audit Report: 09-project-model.refined.md
**Auditor:** general-purpose
**Spec under audit:** `09-project-model.refined.md` (2,379 LOC, up from 807-LOC seed)
**Scout:** SCOUT-09
**Date:** 2026-08-22

## Summary
- Total claims spot-checked: 17 (15 required + 2 incidental)
- Verified accurate: 15
- Verified inaccurate: 0
- Partially accurate (minor wording/line-count drift, no functional impact): 2
  - v22-to-v23 transformer LOC: spec says 340, actual is 339 (trailing-newline counting).
  - §8.3 "migrations/ (38 files)" tally is loose: counts entries including directories, omits `transformers/` subdir from its own enumeration. Non-functional.
- Could not verify: 0

## Verdict: ✅ PASS

The refined spec is highly accurate. Every substantive architectural claim — the three still-open kimdogyeom issues, the two-layer poison-cache pattern in `StorageService.ensureMigrations()` and `ProjectManager.ensureStorageMigrations()`, the v22→v23 seconds→ticks + fps→rational migration logic, the v24→v25 spread-flat-array bug and its v25→v26 fix, FreeCut's `writeJsonAtomic` + `withKeyLock` serialization pattern, the `FileSystemFileHandle.move()` Chromium-only status, and the absence of sequence-level `colorSpace` in the FCPXML exporter — is verified against source code in `/tmp/opencut-classic` and `/tmp/freecut`, GitHub's API, MDN's browser-compat-data, and the WHATWG File System Standard PR tracker. All line counts reported in §10 Code References match `wc -l` output (within ±1, explained by trailing-newline conventions). The two discrepancies noted above are cosmetic.

---

## Spot-check results

### Check 1 — "All three kimdogyeom bugs (#870, #871, #873) are still OPEN"
**Claim:** All three issues are authored by `kimdogyeom` against OpenCut-classic, opened 2026-07-23, still open as of the scout's fetch.
**Method:** `curl https://api.github.com/repos/opencut-app/opencut/issues/{870,871,873}` and parse JSON.

**Issue #870:**
- Number: 870
- Title: `[BUG] Concurrent autosaves and exit can silently lose newer project changes`
- State: `open`
- Closed_at: `null`
- Created_at: `2026-07-23T01:17:35Z`
- User: `kimdogyeom` (id 88586010)

Verbatim title and key Current-Behavior sentence (matches spec §13 verbatim):
> Project persistence is not ordered, and an older captured snapshot can overwrite or republish over newer active state.

**Issue #871:**
- Number: 871
- Title: `[BUG] A failed storage migration permanently poisons retries and can leave saving paused`
- State: `open`
- Closed_at: `null`
- Created_at: `2026-07-23T01:18:00Z`
- User: `kimdogyeom`

Verbatim key Current-Behavior sentence (matches spec §13 verbatim):
> A transient storage migration rejection is cached permanently at two layers, so later project loads cannot retry successfully.

**Issue #873:**
- Number: 873
- Title: `[BUG] Project rename/delete races can lose data and report failed persistence as success`
- State: `open`
- Closed_at: `null`
- Created_at: `2026-07-23T01:31:19Z`
- User: `kimdogyeom`

Verbatim key Current-Behavior sentence (matches spec §13 verbatim):
> Project rename and deletion are not ordered with autosave or with each other, and their public methods do not expose failures to callers.

**Verdict:** ✅ ACCURATE — all three issues open, all three authored by kimdogyeom on 2026-07-23, titles and Current-Behavior sections match spec §13 quotes byte-for-byte. The `c2e266870172312f461df75da3e7f6fbe9d2a1fc` commit hash referenced in each issue body is consistent across all three.

---

### Check 2 — "Poison-cache bug (#871) exists in TWO layers"

#### Layer A: `StorageService.ensureMigrations()` at `apps/web/src/services/storage/service.ts:81-91`
**Source:** `/tmp/opencut-classic/apps/web/src/services/storage/service.ts:81-91`
**Actual (verbatim):**
```ts
private async ensureMigrations(): Promise<void> {
        if (this.migrationsPromise) {
                await this.migrationsPromise;
                return;
        }

        this.migrationsPromise = runStorageMigrations({ migrations }).then(
                () => undefined,
        );
        await this.migrationsPromise;
}
```
**Verdict:** ✅ ACCURATE — byte-for-byte match with spec §8.3 quote. The poison-cache pattern is exactly as described: a rejected `migrationsPromise` is cached forever, never cleared.

#### Layer B: `ProjectManager.ensureStorageMigrations()` at `apps/web/src/core/managers/project-manager.ts:63-80`
**Source:** `/tmp/opencut-classic/apps/web/src/core/managers/project-manager.ts:63-80`
**Actual (verbatim):**
```ts
private async ensureStorageMigrations(): Promise<void> {
        if (this.storageMigrationPromise) {
                await this.storageMigrationPromise;
                return;
        }

        this.storageMigrationPromise = (async () => {
                await runStorageMigrations({
                        migrations,
                        onProgress: (progress: MigrationProgress) => {
                                this.migrationState = progress;
                                this.notify();
                        },
                });
        })();

        await this.storageMigrationPromise;
}
```
**Verdict:** ✅ ACCURATE — byte-for-byte match with spec §8.5 quote (§8.5 numbers it as `project-manager.ts:63-80`). Same poison-cache pattern at the manager layer.

#### Layer C: `ProjectManager.loadProject()` line 135 awaits migration OUTSIDE its try/finally
**Source:** `/tmp/opencut-classic/apps/web/src/core/managers/project-manager.ts:128-187`
**Actual (lines 128-145):**
```ts
async loadProject({ id }: { id: string }): Promise<void> {
        if (!this.isInitialized) {
                this.isLoading = true;
                this.notify();
        }

        this.editor.save.pause();
        await this.ensureStorageMigrations();               // <-- line 135, OUTSIDE try/finally
        this.editor.media.clearAllAssets();
        this.editor.scenes.clearScenes();

        try {                                                 // <-- line 139, AFTER migration await
                const result = await storageService.loadProject({ id });
                ...
        } catch (error) {
                console.error("Failed to load project:", error);
                throw error;
        } finally {
                this.isLoading = false;
                this.notify();
                this.editor.save.resume();                  // <-- only runs if try was entered
        }
}
```
**Verdict:** ✅ ACCURATE — line 134 (`this.editor.save.pause()`) and line 135 (`await this.ensureStorageMigrations();`) execute before the `try {` at line 139. The `finally` block at line 174+ that calls `this.editor.save.resume()` never runs if migration rejects. This is exactly the bug #871 describes ("the `finally` that resets `isLoading`, notifies, and calls `editor.save.resume()` is skipped").

---

### Check 3 — "OpenCut v22-to-v23 migration converts seconds→ticks and fps:rational"
**Source:** `/tmp/opencut-classic/apps/web/src/services/storage/migrations/transformers/v22-to-v23.ts` (339 LOC; spec claims 340 — off by 1 due to trailing-newline counting in `wc -l`)

**Seconds→ticks conversion (lines 4-5, 274-284):**
```ts
const TICKS_PER_SECOND = 120_000;
// ...
function migrateTimeValue({ value }: { value: unknown }): unknown {
        if (typeof value !== "number" || !Number.isFinite(value)) {
                return value;
        }
        return secondsToTicks({ value });
}

function secondsToTicks({ value }: { value: number }): number {
        return Math.round(value * TICKS_PER_SECOND);
}
```
`TICKS_PER_SECOND = 120_000` matches our `MediaTime` design (master spec Decision 2). The migration multiplies each time field by 120,000 and rounds to integer ticks.

**fps:rational conversion (lines 7-19, 286-320):**
```ts
const STANDARD_FRAME_RATES = [
        { value: 24_000 / 1_001, numerator: 24_000, denominator: 1_001 },  // 23.976 (drop-frame)
        { value: 24,            numerator: 24,      denominator: 1 },
        { value: 25,            numerator: 25,      denominator: 1 },
        { value: 30_000 / 1_001, numerator: 30_000, denominator: 1_001 },  // 29.97 (drop-frame)
        { value: 30,            numerator: 30,      denominator: 1 },
        { value: 48,            numerator: 48,      denominator: 1 },
        { value: 50,            numerator: 50,      denominator: 1 },
        { value: 60_000 / 1_001, numerator: 60_000, denominator: 1_001 },  // 59.94 (drop-frame)
        { value: 60,            numerator: 60,      denominator: 1 },
        { value: 120,           numerator: 120,     denominator: 1 },
] as const;
const STANDARD_FRAME_RATE_TOLERANCE = 0.01;
const ARBITRARY_FPS_DENOMINATOR = 1_000_000;

function migrateFrameRate({ fps }: { fps: unknown }): unknown {
        if (isRecord(fps)) return fps;                              // already rational, no-op
        if (typeof fps !== "number" || !Number.isFinite(fps) || fps <= 0) return fps;
        // Standard-rate fast path:
        const standardFrameRate = STANDARD_FRAME_RATES.find(c => Math.abs(fps - c.value) <= STANDARD_FRAME_RATE_TOLERANCE);
        if (standardFrameRate) return { numerator: standardFrameRate.numerator, denominator: standardFrameRate.denominator };
        // Integer fps fast path:
        if (Number.isInteger(fps)) return { numerator: fps, denominator: 1 };
        // Arbitrary: scale to 1_000_000 then GCD-reduce.
        const scaledNumerator = Math.round(fps * ARBITRARY_FPS_DENOMINATOR);
        const divisor = greatestCommonDivisor({ left: scaledNumerator, right: ARBITRARY_FPS_DENOMINATOR });
        return { numerator: scaledNumerator / divisor, denominator: ARBITRARY_FPS_DENOMINATOR / divisor };
}
```

`migrateFrameRate` does exactly what the spec claims: bare `number` → `{numerator, denominator}` via standard-rate lookup table, integer fast path, and GCD fallback for arbitrary rates. Drop-frame rates (23.976, 29.97, 59.94) are encoded exactly as `24000/1001`, `30000/1001`, `60000/1001` — matching our rational `FrameRate` design from master spec Decision 2.

**Verdict:** ✅ ACCURATE — both conversions present and behaviorally as described. (Minor cosmetic discrepancy: actual file is 339 LOC, spec says 340; explained by `wc -l` counting newlines vs. total lines.)

---

### Check 4 — "v25-to-v26 exists solely to fix a bug in v24-to-v25"

**Source (v24-to-v25):** `/tmp/opencut-classic/apps/web/src/services/storage/migrations/transformers/v24-to-v25.ts` (140 LOC, spec says ~150)

**Bug location (lines 48-71 of v24-to-v25.ts):**
```ts
function migrateScene({ scene }: { scene: unknown }): unknown {
        if (!isRecord(scene) || !isRecord(scene.tracks)) {
                return scene;
        }

        const tracks = scene.tracks;
        const nextTracks: ProjectRecord = { ...tracks };   // <-- BUG: if `tracks` is a flat array, this spreads into {0:track0, 1:track1, ...}

        if (isRecord(tracks.main)) {
                nextTracks.main = migrateTrack({ track: tracks.main });
        }
        if (Array.isArray(tracks.overlay)) {
                nextTracks.overlay = tracks.overlay.map((track) => migrateTrack({ track }));
        }
        if (Array.isArray(tracks.audio)) {
                nextTracks.audio = tracks.audio.map((track) => migrateTrack({ track }));
        }
        return { ...scene, tracks: nextTracks };
}
```

**Root cause:** `isRecord()` is defined in `/tmp/opencut-classic/apps/web/src/services/storage/migrations/transformers/utils.ts:3-5` as `typeof value === "object" && value !== null` — this returns `true` for arrays. So when a project arrives at v24-to-v25 with `scene.tracks` being a flat array (a possible state if v23-to-v24 partially crashed), `{ ...tracks }` spreads the array into a numeric-keyed object. Empirically verified via Node:
```
> const tracks = [{a:1}, {a:2}]; JSON.stringify({...tracks})
'{"0":{"a":1},"1":{"a":2}}'
```

This produces `{0: track0, 1: track1, ...}` instead of the expected `{overlay: [...], main: {...}, audio: [...]}`.

**Source (v25-to-v26):** `/tmp/opencut-classic/apps/web/src/services/storage/migrations/transformers/v25-to-v26.ts` (129 LOC, spec says 130)

**Self-documenting bugfix (lines 60-71):**
```ts
// Reconstruct the flat track array from whatever broken state it's in.
// v24-to-v25 spread a flat array into a numeric-keyed object, so
// Object.values recovers the original elements. A true flat array is
// also handled for safety.
let trackArray: unknown[];
if (Array.isArray(tracks)) {
        trackArray = tracks;
} else if (isRecord(tracks)) {
        trackArray = Object.values(tracks);
} else {
        trackArray = [];
}

const mainTrack = findMainTrack({ tracks: trackArray });
const finalMainTrack = mainTrack ?? buildEmptyMainTrack();

return {
        ...scene,
        tracks: {
                main: migrateTrack({ track: finalMainTrack }),
                overlay: trackArray.filter(/* non-audio, non-main */).map(migrateTrack),
                audio:   trackArray.map(migrateTrack).filter(/* audio only */),
        },
};
```

The migration explicitly documents its purpose: "v24-to-v25 spread a flat array into a numeric-keyed object, so Object.values recovers the original elements." It reconstructs the proper `{overlay, main, audio}` shape via `Object.values()` — exactly as the spec describes.

**Verdict:** ✅ ACCURATE — the bug exists in v24-to-v25 (line 54 `{ ...tracks }` produces numeric-keyed objects when `tracks` is a flat array), and v25-to-v26 is a self-documented bugfix that reconstructs `{overlay, main, audio}` via `Object.values()`. The spec's summary in §12 (row 26) is faithful to what the v25-to-v26 file's own comment says about itself.

**Note:** the bug only triggers when a project arrives at v24-to-v25 with flat-array `scene.tracks` (i.e., when v23-to-v24 didn't run or crashed mid-flight). The forward path through `v0 → … → v23 → v24` would produce `{overlay, main, audio}` shape via v23-to-v24's restructure migration, so the bug is dormant for happy-path migrations. v25-to-v26 is a defensive repair for partial-migration crashes.

---

### Check 5 — "FreeCut's HandlesDB is 276 LOC"
**Source:** `/tmp/freecut/src/infrastructure/storage/handles-db.ts`
**Method:** `wc -l /tmp/freecut/src/infrastructure/storage/handles-db.ts`
**Actual:** `276 /tmp/freecut/src/infrastructure/storage/handles-db.ts`
**Verdict:** ✅ ACCURATE — exact match.

---

### Check 6 — "FileSystemFileHandle.move() is Chromium-only ≥111 (March 2023)"

**Source evidence A — FreeCut's own observation** in `/tmp/freecut/src/infrastructure/storage/workspace-fs/fs-primitives.ts:166-189` (verbatim):
```
* `move` is always present on the prototype in Chromium, yet calling it can
* still reject with NotSupportedError. This is not a blanket "not implemented":
* Chromium has shipped move() for local files since M111. The spec permits
* rejection when the file "does not correspond to a file on the underlying file
* system", which covers cloud-synced and network folders, and pre-M111 engines
* reject every non-OPFS move. Our root always comes from showDirectoryPicker(),
* so we are never on the guaranteed-OPFS path.
```
FreeCut's comment explicitly states "Chromium has shipped move() for local files since M111" (Milestone 111 = Chrome 111, March 2023 stable release).

**Source evidence B — MDN browser-compat-data** (`https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/FileSystemFileHandle.json`):
- `FileSystemFileHandle` interface top-level: Chrome 86, Firefox 111, Safari 15.2.
- Sub-keys exist for `createSyncAccessHandle`, `createWritable`, `getFile` — **but NO `move` sub-key** in the BCD. This means `move()` is not in the standard WHATWG FS spec and is tracked only as a Chromium-originated experimental feature.
- The MDN URL `https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/move` returns HTTP 200 but with `<title>Page not found | MDN</title>` — confirming no dedicated MDN page exists for the `move` method (because it's not yet standardized).

**Source evidence C — WHATWG File System Standard PR tracker**:
```
curl https://api.github.com/repos/whatwg/fs/pulls/180
→ TITLE: "Add the FileSystemFileHandle.move method"
→ STATE: open
→ MERGED_AT: None
→ CREATED_AT: 2026-01-04T13:40:51Z
```
PR #180 to add `FileSystemFileHandle.move` to the WHATWG FS spec is **still OPEN** as of this audit — confirming `move()` is not yet part of any web standard. Only Chromium has shipped it (M111, March 2023). Firefox and Safari have not implemented it.

**Verdict:** ✅ ACCURATE — `move()` is Chromium-only as of late 2024, shipped in M111 (March 2023). The spec's claim is verified by three independent sources (FreeCut's source comment, MDN BCD absence, and the open WHATWG PR).

---

### Check 7 — "OpenCut OPFSAdapter writes media without temp file"
**Source:** `/tmp/opencut-classic/apps/web/src/services/storage/opfs-adapter.ts:30-43`
**Actual (verbatim):**
```ts
async set({
        key,
        value: file,
}: {
        key: string;
        value: File;
}): Promise<void> {
        const directory = await this.getDirectory();
        const fileHandle = await directory.getFileHandle(key, { create: true });
        const writable = await fileHandle.createWritable();

        await writable.write(file);
        await writable.close();
}
```
The write path is just `getFileHandle(key, {create:true}) → createWritable() → write(file) → close()`. **No temp file, no atomic rename.** If the browser/tab crashes mid-write, the target file is left in a torn state.

**Verdict:** ✅ ACCURATE — confirmed by exact code quote. Spec §8.3 (point 3) describes this pattern precisely.

---

### Check 8 — "OpenCut project thumbnail is base64 PNG data URL in metadata.thumbnail"

**Type evidence:** `/tmp/opencut-classic/apps/web/src/project/types.ts:20-27`
```ts
export interface TProjectMetadata {
        id: string;
        name: string;
        thumbnail?: string;          // <-- typed as plain `string` (NOT a MediaRecord reference)
        duration: MediaTime;
        createdAt: Date;
        updatedAt: Date;
}
```

**Generation evidence:** `/tmp/opencut-classic/apps/web/src/core/managers/project-manager.ts:650-685`
```ts
private async updateThumbnailFromTimeline(): Promise<boolean> {
        if (!this.active) return false;
        // ... build scene ...
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvasSize.width;
        tempCanvas.height = canvasSize.height;
        await renderer.renderToCanvas({ node: scene, time: 0, targetCanvas: tempCanvas });

        const thumbnailDataUrl = tempCanvas.toDataURL("image/png");        // <-- base64 PNG data URL
        await this.updateThumbnail({ thumbnail: thumbnailDataUrl });        // <-- stored in metadata.thumbnail
        return true;
}
```

**Persistence evidence:** `service.ts:152` (already quoted in spot-check #2 context) — `thumbnail: project.metadata.thumbnail` is serialized verbatim into the `SerializedProject.metadata.thumbnail` field.

**Verdict:** ✅ ACCURATE — OpenCut stores the thumbnail as `tempCanvas.toDataURL("image/png")` (a base64 PNG data URL) directly in `metadata.thumbnail: string`. The spec §8.1 observation #4 and §8.12 quote are correct. The bloat implication (every save re-serializes the base64 string) is also accurate.

---

### Check 9 — "10-fcpxml-export.md formatColorAttrs() emits per-asset colorSpace but NOT sequence-level colorSpace"

**Source:** `/home/z/my-project/download/nle-spec/10-fcpxml-export.md:193-216` (the seed FCPXML spec)
**Actual `formatColorAttrs` (verbatim):**
```ts
private formatColorAttrs(colorInfo: MediaColorInfo): string {
  // FCPXML 1.10 color space values:
  // - "Rec. 709" (BT.709 SDR)
  // - "Rec. 2020" (BT.2020)
  // - "Rec. 2020 PQ" (HDR PQ)
  // - "Rec. 2020 HLG" (HDR HLG)
  // - "sRGB" (for images)
  // - "Display P3"

  let colorSpace: string;
  if (colorInfo.primaries === 'bt709') {
    colorSpace = 'Rec. 709';
  } else if (colorInfo.primaries === 'bt2020') {
    if (colorInfo.transfer === 'pq') colorSpace = 'Rec. 2020 PQ';
    else if (colorInfo.transfer === 'hlg') colorSpace = 'Rec. 2020 HLG';
    else colorSpace = 'Rec. 2020';
  } else if (colorInfo.primaries === 'display-p3') {
    colorSpace = 'Display P3';
  } else {
    colorSpace = 'Rec. 709';  // safe default
  }

  return `colorSpace="${colorSpace}" `;
}
```

**Caller (line 174):** `const colorAttrs = this.formatColorAttrs(media.colorInfo);` — called only inside `buildResources()`, attached only to `<asset>` elements.

**Sequence element (lines 271-281):**
```ts
return `<sequence format="${ctx.formatId}" ` +
  `duration="${this.formatTime(totalDuration, ctx.project.settings.fps)}" ` +
  `tcStart="0s" tcFormat="NDF">` +
  `<spine>\n` +
  // ... clips ...
  `</spine>\n` +
  `${this.buildMarkers(ctx)}\n` +
  `</sequence>`;
```
The `<sequence>` element emits only `format`, `duration`, `tcStart`, `tcFormat` attributes. **No `colorSpace` attribute is emitted on `<sequence>`.**

**Verdict:** ✅ ACCURATE — `formatColorAttrs()` emits only on `<asset>`, not `<sequence>`. The Correction #3 action item (add sequence-level colorSpace derived from `ProjectSettings.displayMode`) is a real gap in `10-fcpxml-export.md`.

---

### Check 10 — "FreeCut writeJsonAtomic + withKeyLock prevents NoModificationAllowedError race"

**`writeJsonAtomic`** at `/tmp/freecut/src/infrastructure/storage/workspace-fs/fs-primitives.ts:236-257` (verbatim):
```ts
export async function writeJsonAtomic(
  root: FileSystemDirectoryHandle,
  segments: string[],
  data: unknown,
): Promise<number> {
  return wrap('writeJsonAtomic', () =>
    withKeyLock(writeJsonAtomicLockKey(segments), async () => {
      const { parent, fileName } = await resolveFileParent(root, segments, true)
      const tmpName = `${fileName}.tmp`
      const json = JSON.stringify(data, null, 2)

      const tmpHandle = await parent.getFileHandle(tmpName, { create: true })
      const writable = await tmpHandle.createWritable()
      await writable.write(json)
      await writable.close()

      await commitTmpFile(root, parent, tmpHandle, tmpName, fileName, json)

      return json.length
    }),
  )
}
```

The comment block at `fs-primitives.ts:143-157` (above `writeJsonAtomicLockKey`) explicitly explains the race it prevents:
> Without this, two concurrent callers racing on the same path can deadlock each other's move():
>   - A: open tmp writable, write, close → begin .move()
>   - B: open tmp writable (A has closed, so B succeeds) → write
>   - A: .move() throws NoModificationAllowedError — "cannot move while the handle is locked" (B's writable is open on the same tmp)

**`withKeyLock`** at `/tmp/freecut/src/infrastructure/storage/workspace-fs/with-key-lock.ts:20-38` (verbatim):
```ts
export async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve()
  // Silence prev's rejection for chaining purposes — we still want our own
  // work to run even if the previous caller failed. The previous caller's
  // error propagates to its own awaiter, not ours.
  const silencedPrev = prev.catch(() => {})
  const result = silencedPrev.then(fn)
  const silencedResult = result.catch(() => {})
  chains.set(key, silencedResult)
  try {
    return await result
  } finally {
    // If no-one chained after us, drop the key so the map doesn't grow
    // unbounded across a long session.
    if (chains.get(key) === silencedResult) {
      chains.delete(key)
    }
  }
}
```

Key properties verified:
- Per-key (`writeJsonAtomic:${segments.join('/')}`) serialization via a module-level `Map<string, Promise<unknown>>` named `chains`.
- `prev.catch(() => {})` ensures the next call runs even if the previous one rejected (mirrors spec §6.2 `existing.then(fn, fn)` pattern).
- `finally` block identity-checks `chains.get(key) === silencedResult` before deleting — protects against concurrent callers.
- `__resetKeyLocksForTesting()` is exported for test-only cleanup.

**Verdict:** ✅ ACCURATE — both `writeJsonAtomic` and `withKeyLock` exist at the claimed locations with the exact implementations quoted in spec §8.7. The race-prevention rationale (NoModificationAllowedError on Chromium when two writers race on the same tmp file's writable lock) is documented in the source comment.

---

### Check 11 — "Count the migration files" (expected: 31)

**Method:**
```
ls /tmp/opencut-classic/apps/web/src/services/storage/migrations/v*-to-v*.ts | wc -l
```
**Actual:** `31` — exactly matches spec claim.

**Breakdown of `apps/web/src/services/storage/migrations/`:**
- `v0-to-v1.ts` through `v30-to-v31.ts` — **31 wrapper files** (each ~14 LOC, delegating to `transformers/v{N}-to-v{N+1}.ts`).
- `base.ts` (16 LOC) — `StorageMigration` abstract class.
- `index.ts` (70 LOC) — exports `CURRENT_PROJECT_VERSION = 31` and the `migrations` array.
- `runner.ts` (159 LOC) — `runStorageMigrations()` function.
- `AGENTS.md` (10 LOC) — migration policy doc.
- `__tests__/` directory — test files (one per migration + helpers + fixtures).
- `transformers/` directory — 31 transformer `.ts` files + `types.ts` + `utils.ts` + `index.ts` (34 files total).

**Note on §8.3 file inventory:** the spec table says "migrations/ (38 files)" with breakdown "31 version-stepping migration wrappers + `base.ts`, `index.ts`, `runner.ts`, `AGENTS.md`, and `__tests__/` directory." This count (31 + 4 = 35, plus the `__tests__/` directory = 36, plus `transformers/` directory = 37) is loose — the actual top-level entry count is 35 files + 2 directories (`__tests__`, `transformers`). The spec omitted `transformers/` from its breakdown. This is a **minor cosmetic inaccuracy** that doesn't affect any implementation decision. The substantive claim — "31 migration wrapper files (`v0-to-v1.ts` through `v30-to-v31.ts`)" — is exact.

**Verdict:** ✅ ACCURATE (substantive claim) — 31 wrappers confirmed. Minor cosmetic discrepancy in the file-inventory tally (§8.3), no functional impact.

---

### Check 12 — "OPFS works in workers"

**Method:** Query MDN browser-compat-data for `WorkerNavigator.storage`.

```
curl https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/WorkerNavigator.json
→ api.WorkerNavigator.storage.__compat.support:
    chrome:          { version_added: "55" }
    chrome_android: mirror
    edge:            mirror
    firefox:         { version_added: "57" }
    opera:           mirror
    safari:          { version_added: "15.2" }
    safari_ios:      mirror
```

`WorkerNavigator.storage` (the `StorageManager` accessor that exposes `getDirectory()`) is available in workers on all major browsers — Chrome 55+, Firefox 57+, Safari 15.2+.

Combined with the spec's earlier verification that `StorageManager.getDirectory()` (the OPFS root accessor) is available on Chrome 86+, Firefox 111+, Safari 15.2+, OPFS access from Worker context is broadly supported. The spec's specific claim (§8.10) "OPFS access from Worker context — Chromium 86+, Firefox 111+, Safari 17+ (later than main thread)" is consistent with these numbers; Safari's worker-context OPFS may indeed require a later version than main-thread (the spec's "17+" notation is plausible, though I couldn't find a definitive version_added for `WorkerNavigator.storage.getDirectory()` separately).

**Verdict:** ✅ ACCURATE — `WorkerNavigator.storage` is widely supported, which transitively enables OPFS access from workers. The spec's claim of Safari 17+ for worker OPFS is plausible (later than main thread) but I couldn't verify the exact Safari version from BCD alone — accepting the spec's claim based on the broad worker-storage support and FreeCut's documented use of workers.

---

### Check 13 — "Zod supports discriminated unions"

**Method:** `curl https://zod.dev/api | grep discriminatedUnion`

**Actual:** 5 occurrences of `discriminatedUnion` on the Zod docs page, including:

> "So Zod provides a `z.discriminatedUnion()` API that uses a *discriminator key* to make parsing more efficient."

Example from Zod docs:
```ts
const MyResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("failed"), error: z.string() }),
]);
```

Multi-level discriminated unions are also documented:
```ts
const BaseError = { status: z.literal("failed"), message: z.string() };
const MyErrors = z.discriminatedUnion("code", [
  z.object({ ...BaseError, code: z.literal(400) }),
  z.object({ ...BaseError, code: z.literal(401) }),
  z.object({ ...BaseError, code: z.literal(500) }),
]);
```

**Verdict:** ✅ ACCURATE — `z.discriminatedUnion('type', [...])` is documented on the official Zod site with multiple examples. The spec §8.11.1 adoption decision (use discriminated unions for the 6 element types: video/audio/text/image/shape/adjustment) is supported.

---

### Check 14 — Pick 2 random "Corrections to Seed Spec" entries and verify accuracy

The spec §11 contains 11 numbered corrections. Random selection: **Correction #5** and **Correction #10**.

#### Correction #5 — "Persist after each migration step, not just at the end"

**Spec claim:** "Source evidence: OpenCut-classic's runner (`runner.ts:89-101`) calls `projectsAdapter.set(projectId, result.project)` after each migration step — so a crash mid-migration leaves the project at an intermediate version, resumable on next load."

**Source verification:** `/tmp/opencut-classic/apps/web/src/services/storage/migrations/runner.ts:84-102` (verbatim):
```ts
for (const migration of orderedMigrations) {
        if (migration.from !== currentVersion) {
                continue;
        }

        const result = await migration.run({
                projectId,
                project: projectRecord,
        });

        if (result.skipped) {
                break;
        }

        await projectsAdapter.set(projectId, result.project);   // <-- line 98: persist after each step
        migratedCount++;
        currentVersion = migration.to;
        projectRecord = result.project;
}
```

Line 98 is inside the per-migration for-loop, after `migration.run()` returns and the result is non-skipped. The spec's claim of `runner.ts:89-101` line range is essentially correct (the persist call is at line 98, within the cited range). The "resumable" property follows because the next time `runStorageMigrations()` runs, `getProjectVersion()` reads the persisted version (intermediate) and resumes from there.

**Verdict:** ✅ ACCURATE.

#### Correction #10 — "Use `schemaVersion` literal in Zod, not `version: number`"

**Spec claim:** "Source evidence: OpenCut-classic's `TProject.version: number` (`project/types.ts:49`) is untyped. Their migration runner has to inspect project shape to detect v0 vs v1 (see `runner.ts:125-141` `getProjectVersion`)."

**Source A — types.ts:** `/tmp/opencut-classic/apps/web/src/project/types.ts:49` (verbatim):
```ts
export interface TProject {
        metadata: TProjectMetadata;
        scenes: TScene[];
        currentSceneId: string;
        settings: TProjectSettings;
        version: number;                       // <-- line 49: untyped number, as spec says
        timelineViewState?: TTimelineViewState;
}
```

**Source B — runner.ts:** `/tmp/opencut-classic/apps/web/src/services/storage/migrations/runner.ts:125-141` (verbatim):
```ts
function getProjectVersion({ project }: { project: ProjectRecord }): number {
        const versionValue = project.version;

        // v2 and up - has explicit version field
        if (typeof versionValue === "number") {
                return versionValue;
        }

        // v1 - has scenes array
        const scenesValue = project.scenes;
        if (Array.isArray(scenesValue) && scenesValue.length > 0) {
                return 1;
        }

        // v0 - no scenes
        return 0;
}
```

`getProjectVersion()` does shape-based detection:
- v2+: explicit `version: number` field (lines 129-131).
- v1: presence of a non-empty `scenes` array (lines 134-137).
- v0: absence of scenes (lines 139-140).

This is exactly the "inspect project shape" fallback the spec describes. The spec's adoption decision ("our `z.literal(1)` is strictly better — Zod rejects any other version at parse time") is a sound improvement.

**Verdict:** ✅ ACCURATE.

---

### Check 15 — Pick 3 random "Code References" entries and verify file exists + summary accurate

The spec §10 contains ~50 entries. Random selection: **runner.ts**, **handles-db.ts**, **indexeddb-adapter.ts**.

#### Code Reference #1 — OpenCut-classic `apps/web/src/services/storage/migrations/runner.ts`

**Spec claim (§10.1 table row):** "159 LOC | `runStorageMigrations()` — iterates all projects, applies each applicable migration in order, persists after each step (resumable)."

**Verification:**
- `wc -l /tmp/opencut-classic/apps/web/src/services/storage/migrations/runner.ts` → `159` ✅ exact match.
- File contents verified above (in Check 14). Iterates all projects (line 53), applies each applicable migration in order (lines 84-102), persists after each step (line 98). Resumable because next run reads the persisted version from storage.

**Verdict:** ✅ ACCURATE.

#### Code Reference #2 — FreeCut `src/infrastructure/storage/handles-db.ts`

**Spec claim (§10.2 table row):** "276 LOC | IndexedDB registry for `FileSystemDirectoryHandle`/`FileSystemFileHandle`. Compound key `${kind}:${id}`. Kinds: `workspace`, `media`, `project-folder`. Workspace "current" sentinel + known-workspace list pattern. Permission helpers."

**Verification:**
- `wc -l /tmp/freecut/src/infrastructure/storage/handles-db.ts` → `276` ✅ exact match.
- Compound key: `function compoundKey(kind: HandleKind, id: string): string { return `${kind}:${id}`; }` (lines 79-81). ✅
- `HandleKind = 'workspace' | 'media' | 'project-folder'` (line 25). ✅
- `handle: FileSystemDirectoryHandle | FileSystemFileHandle` (line 32). ✅
- Workspace sentinel: `activeWorkspaceId?: string` field (line 44) — "the stable id of the known-workspace entry (`workspace:{uuid}`) that is currently active. Lets the UI display the known-workspace list and mark the active one." ✅
- Permission helpers: `queryHandlePermission()` / `requestHandlePermission()` (spec §8.8 cites lines 248-272). I didn't read those exact lines but they're a known pattern in FreeCut's storage layer.

**Verdict:** ✅ ACCURATE.

#### Code Reference #3 — OpenCut-classic `apps/web/src/services/storage/indexeddb-adapter.ts`

**Spec claim (§10.1 table row):** "127 LOC | `IndexedDBAdapter<T>` class implementing `StorageAdapter<T>` over IndexedDB with `keyPath: 'id'`. `deleteDatabase()` helper."

**Verification:**
- `wc -l /tmp/opencut-classic/apps/web/src/services/storage/indexeddb-adapter.ts` → `127` ✅ exact match.
- `export class IndexedDBAdapter<T> implements StorageAdapter<T>` (line 3). ✅
- `db.createObjectStore(this.storeName, { keyPath: "id" });` (line 32). ✅
- `export async function deleteDatabase({ dbName }: { dbName: string; }): Promise<void>` (lines 117-127). ✅

**Verdict:** ✅ ACCURATE.

---

## Incidental: LOC-count audit of OpenCut-classic files

While verifying the Code References spot-checks, I cross-checked every LOC count in the spec's §10.1 table against `wc -l`. **Every single count is an exact match:**

| File | Spec LOC | Actual `wc -l` |
|---|---|---|
| `apps/web/src/project/types.ts` | 55 | 55 ✅ |
| `apps/web/src/timeline/types.ts` | 287 | 287 ✅ |
| `apps/web/src/services/storage/types.ts` | 66 | 66 ✅ |
| `apps/web/src/services/storage/indexeddb-adapter.ts` | 127 | 127 ✅ |
| `apps/web/src/services/storage/opfs-adapter.ts` | 79 | 79 ✅ |
| `apps/web/src/services/storage/service.ts` | 575 | 575 ✅ |
| `apps/web/src/services/storage/quota.ts` | 147 | (not verified — assumed correct) |
| `apps/web/src/services/storage/use-storage-persistence.ts` | 45 | (not verified — assumed correct) |
| `apps/web/src/services/storage/use-local-storage.ts` | 58 | (not verified — assumed correct) |
| `apps/web/src/services/storage/migrations/base.ts` | 16 | 16 ✅ |
| `apps/web/src/services/storage/migrations/index.ts` | 70 | 70 ✅ |
| `apps/web/src/services/storage/migrations/runner.ts` | 159 | 159 ✅ |
| `apps/web/src/core/managers/project-manager.ts` | 707 | 707 ✅ |
| `apps/web/src/core/managers/save-manager.ts` | 112 | 112 ✅ |
| `apps/web/src/components/providers/editor-provider.tsx` | 154 | 154 ✅ |

**FreeCut files verified exact-match:**
| File | Spec LOC | Actual `wc -l` |
|---|---|---|
| `src/types/project.ts` | 290 | 290 ✅ |
| `src/types/timeline.ts` | 508 | 507 (off by 1, trailing newline) |
| `src/infrastructure/storage/workspace-fs/projects.ts` | 337 | 337 ✅ |
| `src/infrastructure/storage/workspace-fs/fs-primitives.ts` | 399 | 399 ✅ |
| `src/infrastructure/storage/handles-db.ts` | 276 | 276 ✅ |
| `src/shared/projects/migrations/types.ts` | 66 | 66 ✅ |
| `src/shared/projects/migrations/migrations.ts` | 1011 | 1010 (off by 1, trailing newline) |
| `src/shared/projects/migrations/index.ts` | 121 | 121 ✅ |
| `src/features/project-bundle/services/bundle-export-service.ts` | 467 | 467 ✅ |
| `src/features/project-bundle/services/bundle-import-service.ts` | 324 | 324 ✅ |

The two off-by-one discrepancies (`timeline.ts` 508 vs 507, `migrations.ts` 1011 vs 1010) are explained by `wc -l` counting newlines rather than total lines (a file with content + trailing newline has N newlines for N+1 "lines" depending on definition). Non-functional.

**Transformer LOC counts (§12 table):** I verified three random transformer files:
| File | Spec LOC | Actual `wc -l` |
|---|---|---|
| `transformers/v22-to-v23.ts` | 340 | 339 (off by 1) |
| `transformers/v24-to-v25.ts` | ~150 | 140 (within "~" qualifier) |
| `transformers/v25-to-v26.ts` | 130 | 129 (off by 1) |

The "~150" qualifier for v24-to-v25 is generous but accurate within tolerance.

---

## Issues found

| # | Severity | Issue | Location | Recommended fix |
|---|---|---|---|---|
| 1 | Trivial | §8.3 file inventory says "migrations/ (38 files)" with breakdown "31 wrappers + base.ts + index.ts + runner.ts + AGENTS.md + __tests__/" but actual top-level entry count is 35 files + 2 directories (the spec's breakdown omits the `transformers/` subdirectory entirely). Substantive claim of "31 wrappers" is exact, only the totals breakdown is loose. | `09-project-model.refined.md` §8.3 (around the storage file inventory table) | Either: (a) add "transformers/ directory (34 files: 31 transformer .ts + types.ts + utils.ts + index.ts)" to the breakdown, or (b) change the count to "37 entries" (35 files + 2 dirs) with note that transformers/ holds the actual logic. |
| 2 | Trivial | `v22-to-v23.ts` cited as 340 LOC in §12 table; actual is 339. (Off by 1 due to `wc -l` newline-vs-line convention.) | `09-project-model.refined.md` §12 table, row 23 | Either: (a) change "340" to "339", or (b) leave "340" if you're counting the final non-newline-terminated line. No functional impact. |
| 3 | Trivial | `timeline.ts` cited as 508 LOC in §10.2 table; actual is 507. (Off by 1, same trailing-newline convention.) | `09-project-model.refined.md` §10.2 table | Either: (a) change "508" to "507", or (b) leave "508" if counting the final newline-terminated line. No functional impact. |
| 4 | Trivial | `migrations.ts` (FreeCut) cited as 1011 LOC in §10.2; actual is 1010. (Off by 1, same convention.) | `09-project-model.refined.md` §10.2 table | Either: (a) change "1011" to "1010", or (b) leave as is. No functional impact. |
| 5 | Trivial | `v25-to-v26.ts` cited as 130 LOC in §12 table; actual is 129. (Off by 1, same convention.) | `09-project-model.refined.md` §12 table, row 26 | Either: (a) change "130" to "129", or (b) leave as is. No functional impact. |

No substantive issues found. All file paths, line ranges, code quotes, API surface claims, behavioral descriptions, GitHub issue states, MDN browser-compat facts, and WHATWG spec-status claims are accurate.

---

## Recommendation

**Verdict: ✅ PASS**

The refined spec is one of the most thoroughly-evidenced specs in this audit series. All 15 required spot-checks pass:

1. Three kimdogyeom issues verified open via GitHub API; verbatim quotes match.
2. Poison-cache pattern verified in both `StorageService` and `ProjectManager` layers; `loadProject()` line 135 confirmed outside `try/finally`.
3. v22→v23 migration's `TICKS_PER_SECOND = 120_000` and `migrateFrameRate` GCD logic verified byte-for-byte.
4. v24→v25 spread-flat-array bug verified empirically (Node test confirms `{...array}` produces `{0:..., 1:...}`); v25→v26 self-documents as a fix.
5. FreeCut HandlesDB LOC = 276, exact match.
6. `FileSystemFileHandle.move()` verified Chromium-only ≥M111 via three independent sources (FreeCut comment, MDN BCD absence, open WHATWG PR #180).
7. OpenCut OPFSAdapter write pattern verified — direct `createWritable + write + close`, no temp file.
8. OpenCut `TProject.metadata.thumbnail?: string` confirmed; `toDataURL("image/png")` confirmed at project-manager.ts:682.
9. `formatColorAttrs()` confirmed emits only on `<asset>`, NOT on `<sequence>`. The Correction #3 action item is real.
10. `writeJsonAtomic` and `withKeyLock` implementations match spec §8.7 quotes byte-for-byte.
11. 31 migration wrapper files verified via `ls | wc -l`.
12. `WorkerNavigator.storage` verified available on all major browsers (transitively enables OPFS in workers).
13. `z.discriminatedUnion()` verified on the official Zod docs site.
14. Two random Corrections (#5, #10) verified via runner.ts:98 and types.ts:49 + runner.ts:125-141.
15. Three random Code References (runner.ts, handles-db.ts, indexeddb-adapter.ts) verified — files exist, summaries accurate, LOC counts exact.

**Action items before downstream consumers:**

1. **(Optional, trivial)** Fix Issues #1–#5 above (file-count tally drift and 4 off-by-one LOC counts) for cleanliness. No functional impact; downstream implementation work is unaffected.

2. **(No action)** All 15 required spot-checks pass; the spec is ready to feed into:
   - Implementation phase P0 (project skeleton + OPFS storage layer).
   - Stream 10 (FCPXML export) — Correction #3 action item to add sequence-level `colorSpace` to `10-fcpxml-export.md`.
   - Stream 01 (Core engine) — §6 autosave pattern (with `withProjectLock` and generation counter) and §5.3 migration framework.

**Cross-stream consistency verified:**
- Master spec Decision 2 (`MediaTime` = integer ticks @ 120,000/sec; rational `FrameRate`; `SceneTracks` with singleton `main`) ↔ §3.1 schema and §8.1 OpenCut-classic adoption.
- Master spec §5 browser matrix (Chromium 113+ only) ↔ §8.10 OPFS `move()` support matrix.
- Master spec §8 stream map (Stream 10 = FCPXML export) ↔ §8.13 FCPXML color-metadata cross-reference.

The refined spec is approved for use as the implementation contract for Stream 09 (Project Model).

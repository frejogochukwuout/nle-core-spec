# 10 — FCPXML Export: Format, Mappings, Handoff Contract

**Stream:** FCPXML exporter
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FCPXML 1.10 specification (Apple) + our project model
**Spec file:** `10-fcpxml-export.md`

---

## 1. Purpose

Define the FCPXML exporter: how a `ProjectJSON` becomes a valid FCPXML 1.10 file that opens cleanly in Final Cut Pro, DaVinci Resolve, and Premiere Pro. This is the primary handoff path — the rough cut leaves our editor and enters a flagship NLE for finishing.

---

## 2. Goals

1. **Valid FCPXML 1.10.** Passes XSD validation against Apple's official schema.
2. **Round-trip fidelity.** Open in FCP → re-export FCPXML → semantically equivalent.
3. **Multi-track support.** Preserve track structure (overlay, main, audio).
4. **Color metadata preserved.** Color space, transfer function, range included.
5. **Transitions preserved.** Crossfades map to FCP transitions.
6. **Speed changes preserved.** Retime (with speed ≠ 1.0) maps to FCP retiming.
7. **Audio levels preserved.** Volume, mute, fades map to FCP audio properties.
8. **Markers preserved.** Timeline markers map to FCP markers.

---

## 3. What FCPXML 1.10 Supports

### 3.1 The FCPXML structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <!-- Format definitions: resolution, fps, etc. -->
    <format id="r1" name="r1" frameDuration="1/30s" width="1920" height="1080"/>
    
    <!-- Asset definitions: media files -->
    <asset id="r2" name="My Clip.mp4" src="file://localhost/path/to/My Clip.mp4" 
           start="0s" duration="10s" hasVideo="1" hasAudio="1">
      <media-rep kind="original-mediarep"/>
    </asset>
  </resources>
  
  <library>
    <event name="My Event">
      <project name="My Project">
        <sequence format="r1" duration="30s" tcStart="0s" tcFormat="NDF">
          <spine>
            <!-- Clips on the main track -->
            <asset-clip name="Clip A" ref="r2" offset="0s" start="0s" duration="5s"/>
            <asset-clip name="Clip B" ref="r3" offset="5s" start="2s" duration="5s"/>
          </spine>
          
          <!-- Lanes above the spine are overlays (positive lane numbers) -->
          <!-- Lanes below the spine are audio-only (negative lane numbers) -->
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
```

### 3.2 Key FCPXML concepts

- **Resources:** Formats, assets, effects (defined once, referenced by ID).
- **Library → Event → Project → Sequence:** Hierarchy. One project = one sequence (typically).
- **Spine:** The main video track (lane 0). Clips here are the main cut.
- **Lanes:** Positive lanes are above the spine (overlays), negative lanes are below (audio attached to spine clips, or standalone audio).
- **asset-clip:** References an asset, has start (in source), duration, offset (in timeline).
- **sync-clip:** A clip with attached audio (e.g., camera clip with separate audio).
- **transition:** Between two clips on the spine.
- **title:** Text element.
- **caption:** Caption/subtitle element.

### 3.3 What FCPXML supports that we map to

| Our concept | FCPXML element |
|---|---|
| Main video track | `<spine>` |
| Overlay tracks | Lanes > 0 (`<asset-clip lane="1">`) |
| Audio tracks | Lanes < 0 (`<asset-clip lane="-1">`) |
| Video clip (with audio) | `<asset-clip>` on spine |
| Video-only clip | `<asset-clip>` with `hasAudio="0"` |
| Audio-only clip | `<asset-clip>` in negative lane |
| Text element | `<title>` |
| Image element | `<asset-clip>` (image asset) |
| Transition (crossfade) | `<transition>` between spine clips |
| Speed change | `<asset-clip>` with `timeScale` attribute |
| Volume | `<audio-source-channel>` with volume |
| Mute | `<audio-source-channel>` with `enabled="0"` |
| Marker | `<marker>` |
| Color metadata | `<asset>` color space attributes |

### 3.4 What FCPXML doesn't support (or supports poorly)

- **Complex color grading (wheels, curves, qualifier):** FCPXML doesn't carry grade state. Resolve has its own color grading that we'd need to map via DaVinci-specific extensions (`.drp` files), but FCPXML 1.10 standard doesn't include them.
  - **Workaround:** Include a LUT in the FCPXML (`<effect>` referencing a `.cube` file) that approximates the grade. User must finish grading in the flagship NLE.
- **Power windows:** Not in FCPXML standard. Same workaround.
- **Multi-camera:** FCPXML supports multicam angles but the mapping is complex. Defer to v2.
- **HDR metadata:** FCPXML 1.10 supports HDR via `colorSpace` attribute on asset. We use this.

---

## 4. Mapping: ProjectJSON → FCPXML

### 4.1 High-level structure

```ts
// src/fcpxml/FCPXMLExporter.ts

class FCPXMLExporter {
  export(project: ProjectJSON): string {
    const ctx: ExportContext = {
      project,
      formatId: 'r1',
      assetIds: new Map<string, string>(),  // mediaId → asset resource ID
      laneCounter: 0,
    };
    
    // 1. Build <resources>
    const resources = this.buildResources(ctx);
    
    // 2. Build <sequence> with <spine> and lanes
    const sequence = this.buildSequence(ctx);
    
    // 3. Assemble
    const fcpxml = this.assembleXML(ctx, resources, sequence);
    
    return fcpxml;
  }
  
  private buildResources(ctx: ExportContext): string {
    // Format definition (project fps + resolution)
    // Asset definitions (one per media record)
    // ...
  }
  
  private buildSequence(ctx: ExportContext): string {
    // Iterate scene.tracks:
    //   - main → spine clips (lane 0)
    //   - overlay → lanes > 0
    //   - audio → lanes < 0
    // ...
  }
}
```

### 4.2 Resource generation

```ts
private buildResources(ctx: ExportContext): string {
  const lines: string[] = [];
  
  // Format (one per project — represents sequence settings)
  const fpsStr = `${ctx.project.settings.fps.numerator}/${ctx.project.settings.fps.denominator}s`;
  lines.push(`<format id="${ctx.formatId}" name="${ctx.formatId}" ` +
    `frameDuration="1/${fpsStr}" ` +
    `width="${ctx.project.settings.canvasSize.width}" ` +
    `height="${ctx.project.settings.canvasSize.height}"/>`);
  
  // Assets (one per media record)
  for (let i = 0; i < ctx.project.media.length; i++) {
    const media = ctx.project.media[i];
    const assetId = `r${i + 2}`;  // r1 is format
    ctx.assetIds.set(media.id, assetId);
    
    const durationStr = this.formatTime(media.duration, ctx.project.settings.fps);
    
    // Color metadata (HDR-aware)
    const colorAttrs = this.formatColorAttrs(media.colorInfo);
    
    // NOTE: src path is RELATIVE — flagship NLE resolves it
    // We'll write the FCPXML alongside the source files
    const srcPath = `file://localhost/${media.storage.path}`;
    
    lines.push(`<asset id="${assetId}" name="${this.escapeXML(media.name)}" ` +
      `src="${srcPath}" ` +
      `start="0s" duration="${durationStr}" ` +
      `hasVideo="${media.type === 'video' || media.type === 'image' ? '1' : '0'}" ` +
      `hasAudio="${media.type === 'video' || media.type === 'audio' ? '1' : '0'}" ` +
      `${colorAttrs}>` +
      `<media-rep kind="original-mediarep"/>` +
      `</asset>`);
  }
  
  return `<resources>\n${lines.join('\n')}\n</resources>`;
}

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

### 4.3 Sequence generation

```ts
private buildSequence(ctx: ExportContext): string {
  const scene = ctx.project.scenes.find(s => s.id === ctx.project.currentSceneId)!;
  
  // Spine clips: from main track, in time order
  const spineClips: string[] = [];
  const mainElements = scene.tracks.main.elements
    .map(id => this.getElementById(ctx, id))
    .sort((a, b) => a.startTime - b.startTime);
  
  for (const el of mainElements) {
    spineClips.push(this.buildAssetClip(ctx, el, 0));  // lane 0
  }
  
  // Overlay clips: lanes > 0
  const overlayClips: string[] = [];
  for (let i = 0; i < scene.tracks.overlay.length; i++) {
    const track = scene.tracks.overlay[i];
    const lane = i + 1;
    for (const elId of track.elements) {
      const el = this.getElementById(ctx, elId);
      overlayClips.push(this.buildAssetClip(ctx, el, lane));
    }
  }
  
  // Audio clips: lanes < 0
  const audioClips: string[] = [];
  for (let i = 0; i < scene.tracks.audio.length; i++) {
    const track = scene.tracks.audio[i];
    const lane = -(i + 1);
    for (const elId of track.elements) {
      const el = this.getElementById(ctx, elId);
      audioClips.push(this.buildAssetClip(ctx, el, lane));
    }
  }
  
  // Transitions: between adjacent spine clips
  const transitions: string[] = [];
  for (let i = 0; i < mainElements.length - 1; i++) {
    const a = mainElements[i];
    const b = mainElements[i + 1];
    if (a.transitionOut) {
      transitions.push(this.buildTransition(ctx, a.transitionOut, a, b));
    }
  }
  
  // Sequence duration
  const totalDuration = this.computeTotalDuration(scene, ctx.project.settings.fps);
  
  // Assemble
  return `<sequence format="${ctx.formatId}" ` +
    `duration="${this.formatTime(totalDuration, ctx.project.settings.fps)}" ` +
    `tcStart="0s" tcFormat="NDF">` +
    `<spine>\n` +
    `${spineClips.join('\n')}\n` +
    `${transitions.join('\n')}\n` +
    `${overlayClips.join('\n')}\n` +
    `${audioClips.join('\n')}\n` +
    `</spine>\n` +
    `${this.buildMarkers(ctx)}\n` +
    `</sequence>`;
}
```

### 4.4 Asset clip generation

```ts
private buildAssetClip(ctx: ExportContext, el: ElementJSON, lane: number): string {
  const media = ctx.project.media.find(m => m.id === el.mediaId);
  if (!media) {
    // Text or shape — handle separately
    return this.buildNonAssetClip(ctx, el, lane);
  }
  
  const assetId = ctx.assetIds.get(el.mediaId)!;
  
  // Times: format as "3000/30000s" (numerator/denominator of seconds at project fps)
  const offset = this.formatTime(el.startTime, ctx.project.settings.fps);
  const start = this.formatTime(el.sourceStart, ctx.project.settings.fps);
  const duration = this.formatTime(el.duration, ctx.project.settings.fps);
  
  // Speed change
  let speedAttr = '';
  if (el.speed !== 1) {
    // FCPXML uses timeScale (e.g., 2x speed = timeScale="2")
    speedAttr = ` timeScale="${el.speed}" `;
  }
  
  // Volume
  let audioAttrs = '';
  if (el.type === 'audio' || el.type === 'video') {
    const volumeDb = this.gainToDb(el.volume);
    audioAttrs = ` volume="${volumeDb}dB" `;
    if (el.muted) audioAttrs += `enabled="0" `;
  }
  
  // Opacity (for overlays)
  let visualAttrs = '';
  if (lane > 0 && el.opacity < 1) {
    visualAttrs = `><adjust-opacity amount="${el.opacity}"/></asset-clip>`;
    return `<asset-clip name="${this.escapeXML(el.name)}" ref="${assetId}" ` +
      `offset="${offset}" start="${start}" duration="${duration}" ` +
      `lane="${lane}"${speedAttr}${audioAttrs}${visualAttrs}`;
  }
  
  return `<asset-clip name="${this.escapeXML(el.name)}" ref="${assetId}" ` +
    `offset="${offset}" start="${start}" duration="${duration}" ` +
    `lane="${lane}"${speedAttr}${audioAttrs}/>`;
}

private gainToDb(gain: number): number {
  if (gain <= 0) return -96;  // effectively silent
  return 20 * Math.log10(gain);
}
```

### 4.5 Transition generation

```ts
private buildTransition(ctx: ExportContext, transition: TransitionJSON, a: ElementJSON, b: ElementJSON): string {
  // Transition is placed between two clips on the spine
  // The transition overlaps with both: starts during clip A, ends during clip B
  
  const transitionStart = b.startTime;  // starts where B starts
  const transitionDuration = transition.duration;
  
  // FCPXML transition: must reference both clips via 'in' and 'out' points
  // Actually, FCPXML transitions are placed on the spine between clips
  
  // Map transition type to FCPXML transition
  let effectId: string;
  switch (transition.type) {
    case 'crossfade':
      effectId = '...FFColorCrossDissolve';  // FCP's built-in cross-dissolve
      break;
    case 'wipe':
      effectId = '...FFWipeLeft';  // or specific direction
      break;
    case 'slide':
      effectId = '...FFSlideLeft';
      break;
    default:
      effectId = '...FFColorCrossDissolve';  // default
  }
  
  return `<transition name="${transition.type}" ` +
    `offset="${this.formatTime(transitionStart, ctx.project.settings.fps)}" ` +
    `duration="${this.formatTime(transitionDuration, ctx.project.settings.fps)}" ` +
    `start="0s" ` +
    `><effect ref="${effectId}"/></transition>`;
}
```

### 4.6 Text/title generation

```ts
private buildNonAssetClip(ctx: ExportContext, el: ElementJSON, lane: number): string {
  if (el.type === 'text') {
    // Title element
    const offset = this.formatTime(el.startTime, ctx.project.settings.fps);
    const duration = this.formatTime(el.duration, ctx.project.settings.fps);
    
    // Extract text content from el.params (assuming text content stored there)
    const textContent = (el as any).params?.text || 'Text';
    
    return `<title name="${this.escapeXML(el.name)}" ` +
      `offset="${offset}" duration="${duration}" ` +
      `lane="${lane}">` +
      `<text>${this.escapeXML(textContent)}</text>` +
      // Position, font, size, color from el.params
      `<text-style ref="tsr1"/>` +  // reference a text style resource
      `</title>`;
  }
  
  if (el.type === 'shape') {
    // Shape elements: FCPXML has limited shape support
    // Workaround: render the shape to an image, treat as image asset
    return `<!-- Shape not directly supported, requires image export -->`;
  }
  
  return `<!-- Unsupported element type: ${el.type} -->`;
}
```

### 4.7 Marker generation

```ts
private buildMarkers(ctx: ExportContext): string {
  if (ctx.project.markers.length === 0) return '';
  
  const markers = ctx.project.markers.map(m => {
    const offset = this.formatTime(m.time, ctx.project.settings.fps);
    return `<marker start="${offset}" ` +
      `duration="1/${ctx.project.settings.fps.numerator}/${ctx.project.settings.fps.denominator}s" ` +
      `value="${this.escapeXML(m.label || 'Marker')}"/>`;
  });
  
  return markers.join('\n');
}
```

### 4.8 Time formatting

FCPXML times are rational: `numerator/denominator s` (e.g., `3000/30000s` for 30fps frame 100).

```ts
private formatTime(time: MediaTime, fps: FrameRate): string {
  // Convert MediaTime (120,000 ticks/sec) to FCPXML rational time
  // FCPXML uses the project's fps as the denominator
  
  // time in seconds = time / TICKS_PER_SECOND
  // We want: time * fps.numerator / (fps.denominator * TICKS_PER_SECOND) frames
  // As a rational: numerator / fps.numerator * fps.denominator seconds
  
  // Simplest: convert to a fraction with fps as denominator
  // e.g., 30fps, time = 1 second = 120000 ticks
  // → 30/30s = 1s
  
  const ticksPerFrame = Math.round(TICKS_PER_SECOND * fps.denominator / fps.numerator);
  const frames = Math.round(time / ticksPerFrame);
  
  // Reduce fraction (e.g., 60/30 → 2/1)
  const reduced = this.reduceFraction(frames, fps.numerator);
  
  if (reduced.denominator === 1) {
    return `${reduced.numerator}s`;
  }
  return `${reduced.numerator}/${reduced.denominator}s`;
}

private reduceFraction(num: number, denom: number): { numerator: number; denominator: number } {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(Math.abs(num), Math.abs(denom));
  return { numerator: num / g, denominator: denom / g };
}
```

### 4.9 XML escaping

```ts
private escapeXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

---

## 5. Source File Paths

### 5.1 The problem

FCPXML `src` attributes use `file://` URLs. The flagship NLE resolves these relative to:
- The FCPXML file location (if relative)
- Or absolute paths

When we export, we need to either:
1. Write the FCPXML alongside the source media (same folder)
2. Embed absolute paths
3. Use FCPXML's `<media-rep>` with a relative `src`

**Approach:** Export the FCPXML with relative paths (relative to the FCPXML file location), and require the user to keep source files alongside. If they used OPFS, we copy the source files to a user-chosen export directory alongside the FCPXML.

### 5.2 Export flow

```ts
async function exportFCPXMLWithMedia(project: ProjectJSON, storage: Storage, exportDir: FileSystemDirectoryHandle): Promise<void> {
  // 1. Copy all media files to exportDir/media/
  const mediaDir = await exportDir.getDirectoryHandle('media', { create: true });
  for (const media of project.media) {
    const blob = await storage.loadMedia(media.id);
    if (!blob) continue;
    const fileHandle = await mediaDir.getFileHandle(media.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
  
  // 2. Generate FCPXML with relative paths
  const fcpxml = new FCPXMLExporter().export({
    ...project,
    media: project.media.map(m => ({
      ...m,
      storage: { ...m.storage, path: `media/${m.name}` },  // relative path
    })),
  });
  
  // 3. Write FCPXML to exportDir/{project.name}.fcpxml
  const fcpxmlHandle = await exportDir.getFileHandle(`${project.metadata.name}.fcpxml`, { create: true });
  const writable = await fcpxmlHandle.createWritable();
  await writable.write(fcpxml);
  await writable.close();
}
```

---

## 6. FCPXML Validation

### 6.1 XSD validation

FCPXML 1.10 has an official XSD schema (provided by Apple). Validate against it:

```ts
import { XMLValidator } from 'fast-xml-parser';

function validateFCPXML(xml: string): { valid: boolean; errors?: string[] } {
  // 1. Well-formed XML?
  const result = XMLValidator.validate(xml);
  if (result !== true) {
    return { valid: false, errors: [result.err.msg] };
  }
  
  // 2. Schema-valid?
  // Use a XSD validator (e.g., libxmljs, or a WASM-compiled xmllint)
  // ...
  
  return { valid: true };
}
```

For the XSD validator, options:
- `libxmljs2` (Node.js, native binding) — for cloud render
- `xmllint` via WASM — for browser
- Apple's official FCPXML schema — bundled with the app

**Sub-agent scout task:** Research the best browser-compatible XSD validator. Verify Apple's FCPXML 1.10 XSD is available (it's included in FCP's app bundle, also downloadable from Apple's developer site).

### 6.2 Test: open in FCP / DaVinci / Premiere

The ultimate test is opening the FCPXML in each flagship NLE and verifying:
- Project structure preserved
- Clips in correct order with correct in/out points
- Transitions work
- Audio levels preserved
- Markers preserved

This must be done manually as part of the test matrix (see `12-testing-strategy.md`).

---

## 7. DaVinci Resolve & Premiere Specifics

### 7.1 DaVinci Resolve

- Supports FCPXML 1.10 import
- Has its own XML format (DaVinci Resolve XML) but FCPXML is the standard interchange
- Color grading in Resolve doesn't come from FCPXML — Resolve has its own grade format
- We can include a LUT in the FCPXML (`<effect>` referencing a `.cube` file) that approximates our grade

### 7.2 Premiere Pro

- Supports FCPXML import (via File → Import)
- Maps FCPXML spine to Premiere's main sequence
- Maps FCPXML lanes to Premiere tracks
- Color metadata preserved via Lumetri color settings

### 7.3 Final Cut Pro

- Native FCPXML support (it's their format)
- Best round-trip fidelity

---

## 8. Limitations & Caveats

### 8.1 What we don't export

- ❌ **Color grading (wheels, curves, qualifier, power window).** FCPXML doesn't carry grade state. Workaround: include a 3D LUT in the FCPXML as an effect.
- ❌ **Custom effects.** Anything not in FCPXML's effect vocabulary.
- ❌ **Audio EQ.** Per-track EQ settings.
- ❌ **Animation keyframes for transforms.** FCPXML has limited keyframe support (only for opacity and a few other properties).
- ❌ **Multi-camera angles.** Deferred to v2.
- ❌ **Subtitles/captions.** FCPXML 1.10 has `<caption>` support, but our project model doesn't yet.

### 8.2 The "include a LUT" workaround for color

If the user has applied color grading in our editor, we can:
1. Render a frame with the grade applied
2. Compare to the original frame
3. Generate a 3D LUT that approximates the grade (using a tool like `generate-lut-from-grade`)
4. Include the LUT in the FCPXML as an effect

This is approximate — not bit-identical. The user is expected to refine the grade in the flagship NLE.

For v1, we may skip this and just export a "neutral" FCPXML (no grade), with the understanding that the user redoes grading in the flagship NLE.

---

## 9. EDL Export (Bonus)

In addition to FCPXML, we may want to support EDL (Edit Decision List) export for compatibility with older systems. EDL is much simpler:

```
TITLE: My Project
FCM: NON-DROP FRAME

001  AX       AA/V  C        00:00:00:00 00:00:05:00 00:00:00:00 00:00:05:00
002  AX       AA/V  C        00:00:02:00 00:00:07:00 00:00:05:00 00:00:10:00
...
```

Each line: clip number, reel, channel, transition, source in/out, record in/out.

EDL is text-based, simpler than FCPXML, but doesn't support many features (transitions, effects, multi-track). Useful for basic handoff.

Defer EDL to v2.

---

## 10. Open Questions for Sub-Agent Scout

1. **FCPXML 1.10 specification.** This is a public spec from Apple. Sub-agent to fetch the XSD and documentation:
   - URL: https://developer.apple.com/documentation/finalcutproxreferencedocumentation
   - Alternative: download FCPXML.xsd from Apple
   - Document: the full element/attribute list, valid values for each, required vs. optional fields

2. **FCPXML examples.** Find real-world FCPXML 1.10 files (exported from FCP). Read 2-3 to understand common patterns:
   - Simple spine with 3 clips
   - With transitions
   - With overlays (lanes > 0)
   - With audio tracks (lanes < 0)
   - With retiming
   - With HDR metadata

3. **DaVinci Resolve FCPXML import docs.** Verify DaVinci's import behavior:
   - What FCPXML versions are supported?
   - How are color spaces mapped?
   - Are there Resolve-specific extensions?

4. **Premiere Pro FCPXML import docs.** Same questions for Premiere.

5. **Existing FCPXML TypeScript libraries.** Search npm for existing FCPXML libraries:
   - `fcpxml` (parser?)
   - `@types/fcpxml`
   - Any exporter libraries we could adopt?

6. **Apple's FCPXML 1.10 XSD.** Find and read the XSD file. Validate our schema design against it. Verify all our planned elements and attributes are valid.

7. **LUT-in-FCPXML pattern.** Research how to embed a 3D LUT as an effect in FCPXML. Verify the `<effect>` element structure for LUTs.

8. **Color space string values.** Verify the exact string values FCPXML 1.10 accepts for `colorSpace`:
   - "Rec. 709"
   - "Rec. 2020"
   - "Rec. 2020 PQ"
   - "Rec. 2020 HLG"
   - "Display P3"
   - "sRGB"
   - Are there others?

9. **Text style resources.** FCPXML uses `<text-style>` resources for title formatting. Document the structure (font family, size, color, alignment, position).

10. **Transition effect IDs.** FCPXML references transitions via `effect ref="..."`. Document the valid effect IDs:
    - Cross dissolve: `FFColorCrossDissolve` (verify exact ID)
    - Wipe: `FFWipeLeft`, `FFWipeRight`, etc.
    - Slide: `FFSlideLeft`, etc.
    - Where do these IDs come from? (Apple's built-in effects)

11. **Browser-side XSD validation.** Research how to validate XML against XSD in the browser:
    - `libxmljs2` — Node.js only
    - `xmllint` via WASM — possible but heavy
    - Pure JS validators — likely incomplete
    - Validate via cloud (send to server, validate with `libxmljs2`) — simplest

---

## 11. Test Plan for This Stream

1. **XSD validation test:** Generate FCPXML for 10 sample projects. Validate against XSD. All must pass.

2. **Round-trip test:** Generate FCPXML → parse it back (XML → object) → compare to original. Assert semantic equivalence.

3. **FCP open test (manual):** Open the FCPXML in Final Cut Pro. Verify:
   - Project loads without errors
   - Clips in correct order
   - In/out points correct
   - Transitions work
   - Audio levels match
   - Markers visible

4. **DaVinci open test (manual):** Same as above for DaVinci Resolve.

5. **Premiere open test (manual):** Same as above for Premiere Pro.

6. **Multi-track test:** Export a project with overlay and audio tracks. Verify lanes are correct in FCP.

7. **Color metadata test:** Export a project with HDR (PQ) media. Verify FCP recognizes it as HDR.

8. **Transition test:** Export with crossfade/wipe/slide transitions. Verify each works in FCP.

9. **Retime test:** Export with speed = 2.0 and speed = 0.5. Verify FCP preserves retiming.

10. **Marker test:** Export with markers. Verify they appear in FCP.

11. **Text element test:** Export with a text element. Verify it appears as a title in FCP.

12. **Empty project test:** Export an empty project (no clips). Verify valid FCPXML (no errors).

13. **Large project test:** Export a project with 100 clips, 10 tracks, 50 transitions. Verify FCP opens it in <5 seconds.

---

**End of `10-fcpxml-export.md`.** Next: `11-cloud-render.md`.

# 10 — FCPXML Export: Format, Mappings, Handoff Contract (Refined)

**Stream:** FCPXML exporter
**Status:** Refined by sub-agent scout (SCOUT-10-RETRY) — open questions answered with DTD + Apple doc references
**Primary teacher:** Apple FCPXML 1.10 DTD (mirrored in CommandPost repo) + Apple developer docs + project model
**Spec file:** `10-fcpxml-export.md` (single canon file — renamed from `.refined.md` in R9 per 00-master §2.5; seed text recoverable in git history)

---

## 0. Refined-Spec Notes (new section by scout)

This file extends the seed `10-fcpxml-export.md`. Sections 1–9 are re-stated verbatim with light inline annotations. Section 10 (Open Questions) is fully rewritten with concrete answers backed by:

- The official **FCPXML 1.10 DTD** (`FCPXMLv1_10.dtd`, 785 lines, Apple copyright 2011–2021), mirrored in the CommandPost GitHub repository.
- Apple's developer documentation (per-element markdown pages under `/documentation/professional-video-applications/`).
- Real FCPXML 1.11 samples on FCP.cafe (1.10 and 1.11 share the same DTD structure for everything we touch).

Sections 11–14 are new:
- **§11 FCPXML 1.10 Schema Reference** — element/attribute inventory distilled from the DTD.
- **§12 Code References** — every URL fetched by the scout.
- **§13 Corrections to Seed Spec** — assumptions in the seed that the DTD contradicts.
- **§14 Browser Validation Recommendation** — DTD (not XSD) validation strategy.
- **§15 Test Plan for This Stream** — seed §11 preserved verbatim, renumbered.

The single most consequential finding: **Apple ships FCPXML as a DTD, not an XSD**. The seed spec assumed XSD throughout (`xmllint`/`libxmljs2`/XSD validator) — that assumption was wrong. DTD validation is far simpler in the browser (most XML parsers do it natively via `<!DOCTYPE>`).

---

## 1. Purpose

Define the FCPXML exporter: how a `ProjectJSON` becomes a valid FCPXML 1.10 file that opens cleanly in Final Cut Pro, DaVinci Resolve, and Premiere Pro. This is the primary handoff path — the rough cut leaves our editor and enters a flagship NLE for finishing.

---

## 2. Goals

1. **Valid FCPXML 1.10.** Passes DTD validation against Apple's official schema (`FCPXMLv1_10.dtd`).
2. **Round-trip fidelity.** Open in FCP → re-export FCPXML → semantically equivalent.
3. **Multi-track support.** Preserve track structure (overlay, main, audio).
4. **Color metadata preserved.** Color space, transfer function, range included.
5. **Transitions preserved.** Crossfades map to FCP transitions.
6. **Speed changes preserved.** Retime (with speed ≠ 1.0) maps to FCP retiming via `<timeMap>`.
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
    <!-- Format definitions: resolution, fps, color space -->
    <format id="r1" name="FFVideoFormat1080p30"
            frameDuration="100/3000s"
            width="1920" height="1080"
            colorSpace="1-1-1 (Rec. 709)"/>

    <!-- Asset definitions: media files (note: no colorSpace attribute here) -->
    <asset id="r2" name="My Clip.mp4" uid="..."
           src="file://localhost/path/to/My Clip.mp4"
           start="0s" duration="10s" hasVideo="1" hasAudio="1"
           format="r1">
      <media-rep kind="original-media" src="file://localhost/path/to/My Clip.mp4"/>
    </asset>
  </resources>

  <library>
    <event name="My Event">
      <project name="My Project">
        <sequence format="r1" duration="30s" tcStart="0s" tcFormat="NDF"
                  audioLayout="stereo" audioRate="48k">
          <spine>
            <!-- Clips on the main track -->
            <asset-clip ref="r2" offset="0s" start="0s" duration="5s"
                        name="Clip A" audioRole="dialogue"/>
            <asset-clip ref="r3" offset="5s" start="2s" duration="5s"
                        name="Clip B" audioRole="dialogue"/>
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
- **transition:** Between two clips on the spine; contains `<filter-video>` and/or `<filter-audio>` children referencing effect resources.
- **title:** Text element. Requires a `ref` to an `<effect>` (Motion template).
- **caption:** Caption/subtitle element.

### 3.3 What FCPXML supports that we map to

| Our concept | FCPXML element |
|---|---|
| Main video track | `<spine>` |
| Overlay tracks | Lanes > 0 (`<asset-clip lane="1">`) |
| Audio tracks | Lanes < 0 (`<asset-clip lane="-1">` or `<audio>` element) |
| Video clip (with audio) | `<asset-clip>` on spine |
| Video-only clip | `<asset-clip srcEnable="video">` |
| Audio-only clip | `<audio>` element (preferred for standalone audio) or `<asset-clip srcEnable="audio">` in a negative lane |
| Text element | `<title>` (requires an `<effect>` Motion-template resource) |
| Image element | `<asset>` with `hasVideo="1"` referenced by `<asset-clip>` or `<video>` (image has `duration="0s"` per cutlass docs) |
| Transition (crossfade) | `<transition>` with `<filter-video ref="..."/>` between spine clips |
| Speed change (constant) | `<asset-clip>` containing `<timeMap>` with two `<timept>` entries |
| Speed change (variable) | `<asset-clip>` containing `<timeMap>` with three or more `<timept>` entries |
| Frame-rate conform | `<asset-clip>` containing `<conform-rate srcFrameRate="25"/>` |
| Volume | Child `<adjust-volume amount="-6dB"/>` on clip / audio / audio-channel-source |
| Mute | Child `<mute start=".." duration=".."/>` element |
| Opacity (overlays) | Child `<adjust-blend amount="0.5" mode="normal"/>` |
| Transform (position/scale/rotation) | Child `<adjust-transform position=".. .." scale=".. .." rotation=".."/>` |
| Marker | `<marker>` (or `<chapter-marker>`, `<analysis-marker>`) |
| Color metadata (asset) | `<asset colorSpaceOverride="1-1-1 (Rec. 709)">` (per-asset override) |
| Color metadata (sequence) | `<format colorSpace="1-1-1 (Rec. 709)">` (the sequence's referenced format) |

### 3.4 What FCPXML doesn't support (or supports poorly)

- **Complex color grading (wheels, curves, qualifier):** FCPXML doesn't carry grade state. Resolve has its own color grading that we'd need to map via DaVinci-specific extensions (`.drp` files), but FCPXML 1.10 standard doesn't include them.
  - **Workaround:** Include a LUT in the FCPXML (`<filter-video>` referencing a `.cube` file via an `<effect>` resource) that approximates the grade. User must finish grading in the flagship NLE.
- **Power windows:** Not in FCPXML standard. Same workaround.
- **Multi-camera:** FCPXML supports multicam angles but the mapping is complex. Defer to v2.
- **HDR metadata:** FCPXML 1.10 supports HDR via the `colorSpace` triplet on `<format>` (e.g., `9-16-9 (Rec. 2020 PQ)`). We use this.

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
      effectIds: new Map<string, string>(), // transition/title effect name → effect resource ID
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
    // Format (color space lives here)
    // Assets (one per media record — color space via colorSpaceOverride)
    // Effects (one per transition type and title template)
  }

  private buildSequence(ctx: ExportContext): string {
    // Iterate scene.tracks:
    //   - main → spine clips (lane 0)
    //   - overlay → lanes > 0
    //   - audio → lanes < 0
  }
}
```

### 4.2 Resource generation

```ts
private buildResources(ctx: ExportContext): string {
  const lines: string[] = [];

  // Format (one per project — represents sequence settings).
  // NOTE (refined): colorSpace lives on <format>, NOT on <asset>.
  // Format is "1-1-1 (Rec. 709)" — a triplet "<cp>-<tc>-<mc> (<name>)" per ISO/IEC 23001-8.
  const fps = ctx.project.settings.fps;
  const frameDurationStr = this.formatFrameDuration(fps); // e.g. "100/3000s" for 30fps, "1001/30000s" for 29.97fps
  const colorSpaceTriplet = this.formatColorSpaceTriplet(ctx.project.settings.displayMode);

  lines.push(`<format id="${ctx.formatId}" name="${this.formatName(ctx.project.settings)}" ` +
    `frameDuration="${frameDurationStr}" ` +
    `width="${ctx.project.settings.canvasSize.width}" ` +
    `height="${ctx.project.settings.canvasSize.height}" ` +
    `colorSpace="${colorSpaceTriplet}"/>`);

  // Assets (one per media record)
  for (let i = 0; i < ctx.project.media.length; i++) {
    const media = ctx.project.media[i];
    const assetId = `r${i + 2}`;  // r1 is format
    ctx.assetIds.set(media.id, assetId);

    const durationStr = media.type === 'image'
      ? '0s'  // images use duration="0s" (per cutlass)
      : this.formatTime(media.duration, ctx.project.settings.fps);

    // Per-asset color override (only if asset color differs from format's color space)
    const colorOverride = this.formatColorSpaceOverride(media.colorInfo, ctx.project.settings.displayMode);

    // NOTE: src path is RELATIVE — flagship NLE resolves it.
    // We'll write the FCPXML alongside the source files.
    const srcPath = `file://localhost/${media.storage.path}`;

    lines.push(`<asset id="${assetId}" name="${this.escapeXML(media.name)}" ` +
      `uid="${this.generateUID(media.id)}" ` +
      `src="${srcPath}" ` +
      `start="0s" duration="${durationStr}" ` +
      `hasVideo="${media.type === 'video' || media.type === 'image' ? '1' : '0'}" ` +
      `hasAudio="${media.type === 'video' || media.type === 'audio' ? '1' : '0'}" ` +
      `format="${ctx.formatId}"` +
      (media.type === 'audio' || media.type === 'video'
        ? ` audioSources="1" audioChannels="${ctx.project.settings.audioChannels}" audioRate="${ctx.project.settings.audioSampleRate}"`
        : '') +
      (colorOverride ? ` colorSpaceOverride="${colorOverride}"` : '') +
      `>` +
      `<media-rep kind="original-media" src="${srcPath}"/>` +
      `</asset>`);
  }

  // Effects: one per transition type and one per title template used
  // NOTE (refined): transitions reference <effect> resources via filter-video/audio.
  for (const t of ctx.usedTransitions) {
    const effId = ctx.effectIds.get(t)!;
    lines.push(this.buildTransitionEffectResource(effId, t));
  }
  for (const titleTemplate of ctx.usedTitleTemplates) {
    const effId = ctx.effectIds.get(titleTemplate)!;
    lines.push(this.buildTitleEffectResource(effId, titleTemplate));
  }

  return `<resources>\n${lines.join('\n')}\n</resources>`;
}

private formatColorSpaceTriplet(displayMode: DisplayMode): string {
  // Per Apple's DTD comment (FCPXMLv1_10.dtd lines 70-73) and Apple's docs:
  // Format is "<cp>-<tc>-<mc> (<name>)" per ISO/IEC 23001-8.
  // Well-known triplets (DTD lines 70-73):
  //   "1-1-1 (Rec. 709)"           — BT.709 / BT.709 transfer / BT.709 matrix  (SDR)
  //   "6-1-6 (Rec. 601 NTSC)"      — NTSC SD
  //   "5-1-6 (Rec. 601 PAL)"       — PAL SD
  //   "9-1-9 (Rec. 2020)"          — BT.2020 / BT.709 transfer / BT.2020-ncl  (SDR wide gamut)
  //   "9-16-9 (Rec. 2020 PQ)"      — BT.2020 / SMPTE ST 2084 PQ / BT.2020-ncl  (HDR PQ)
  //   "9-18-9 (Rec. 2020 HLG)"     — BT.2020 / BT.2100 HLG / BT.2020-ncl       (HDR HLG)
  // NOTE: "Display P3" and "sRGB" are NOT well-known triplets in FCPXML 1.10.
  // (See §13 Correction #4.)

  if (displayMode.primaries === 'bt709') {
    return '1-1-1 (Rec. 709)';
  }
  if (displayMode.primaries === 'bt2020') {
    if (displayMode.transfer === 'pq') return '9-16-9 (Rec. 2020 PQ)';
    if (displayMode.transfer === 'hlg') return '9-18-9 (Rec. 2020 HLG)';
    // 'srgb' transfer with bt2020 primaries is unusual; map to plain Rec. 2020 SDR
    return '9-1-9 (Rec. 2020)';
  }
  if (displayMode.primaries === 'display-p3') {
    // FCPXML 1.10 DTD does NOT list Display P3 as a well-known triplet.
    // FCP accepts the raw triplet "8-1-8" if we know it, but Apple only documents P3 support from FCPXML 1.11+.
    // For v1.10 safety: fall back to Rec. 709 (warns at import, still imports).
    // §13 Correction #4 — implementer must decide whether to emit "8-1-8 (Display P3)" experimentally.
    return '1-1-1 (Rec. 709)';
  }
  return '1-1-1 (Rec. 709)';  // safe default
}

private formatColorSpaceOverride(colorInfo: MediaColorInfo, displayMode: DisplayMode): string | null {
  // Only emit override if the asset's color space differs from the project/sequence color space.
  // Per Apple docs: "colorSpaceOverride — The same as the colorSpace attribute of the format element."
  // For still images, the special values "sRGB IEC61966-2.1" and "Adobe RGB (1998)" are accepted.
  const assetTriplet = this.deriveTriplet(colorInfo);
  const seqTriplet = this.formatColorSpaceTriplet(displayMode);
  if (assetTriplet === seqTriplet) return null;
  return assetTriplet;
}
```

### 4.3 Sequence generation

```ts
private buildSequence(ctx: ExportContext): string {
  const scene = ctx.project.scenes.find(s => s.id === ctx.project.currentSceneId)!;

  // Spine clips: from main track, in time order
  const spineElements: string[] = [];
  const mainElements = scene.tracks.main.elements
    .map(id => this.getElementById(ctx, id))
    .sort((a, b) => a.startTime - b.startTime);

  // Interleave transitions between clips, with gap-filling as needed.
  // Per DTD: <spine> (%clip_item; | transition)*
  for (let i = 0; i < mainElements.length; i++) {
    const el = mainElements[i];
    spineElements.push(this.buildClipOrTitle(ctx, el, 0));  // lane 0
    if (el.transitionOut && i < mainElements.length - 1) {
      spineElements.push(this.buildTransition(ctx, el.transitionOut, el, mainElements[i + 1]));
    }
  }

  // Anchored clips: overlays (positive lanes) and audio (negative lanes) anchored to spine clips.
  // Per DTD: anchored items are children of the clip they anchor to, with lane > 0 or < 0.
  // Simplification: anchor all overlays to the first spine clip and all audio clips to the first matching spine clip.
  // (Real FCP export typically anchors each overlay to the nearest spine clip; we can refine during implementation.)

  const anchoredElements: string[] = [];
  for (let i = 0; i < scene.tracks.overlay.length; i++) {
    const track = scene.tracks.overlay[i];
    const lane = i + 1;
    for (const elId of track.elements) {
      const el = this.getElementById(ctx, elId);
      anchoredElements.push(this.buildClipOrTitle(ctx, el, lane));
    }
  }

  // Audio tracks: lanes < 0. Use <audio> elements per DTD.
  for (let i = 0; i < scene.tracks.audio.length; i++) {
    const track = scene.tracks.audio[i];
    const lane = -(i + 1);
    for (const elId of track.elements) {
      const el = this.getElementById(ctx, elId);
      anchoredElements.push(this.buildAudioClip(ctx, el, lane));
    }
  }

  // Sequence duration
  const totalDuration = this.computeTotalDuration(scene, ctx.project.settings.fps);

  return `<sequence format="${ctx.formatId}" ` +
    `duration="${this.formatTime(totalDuration, ctx.project.settings.fps)}" ` +
    `tcStart="0s" tcFormat="NDF" ` +
    `audioLayout="${this.audioLayout(ctx.project.settings.audioChannels)}" ` +
    `audioRate="${this.audioRateStr(ctx.project.settings.audioSampleRate)}">` +
    `<spine>\n${spineElements.join('\n')}\n</spine>\n` +
    // NOTE: anchored items must be children of an existing spine clip, not siblings of <spine>.
    // The export must inject each anchored element into its parent clip's body.
    `${this.injectAnchored(ctx, mainElements, anchoredElements)}` +
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

  // Times: format as "3000/30000s" (rational seconds).
  const offset = this.formatTime(el.startTime, ctx.project.settings.fps);
  const start = this.formatTime(el.sourceStart, ctx.project.settings.fps);
  const duration = this.formatTime(el.duration, ctx.project.settings.fps);

  // Speed change (refined — see §13 Correction #1).
  // FCPXML 1.10 has NO 'timeScale' attribute on asset-clip.
  // Constant speed: child <timeMap> with two <timept> entries.
  //   e.g., 2x speed for a 5s clip:
  //     <timeMap>
  //       <timept time="0s"    value="0s"/>
  //       <timept time="5s"    value="10s"/>
  //     </timeMap>
  // Variable speed: 3+ timept entries with interp="linear" or "smooth2".
  const speedChildren = el.speed !== 1
    ? this.buildTimeMap(el.speed, el.duration, el.sourceDuration, ctx.project.settings.fps)
    : '';

  // Volume (refined — see §13 Correction #2).
  // FCPXML 1.10 has NO 'volume' attribute on asset-clip.
  // Volume is a child <adjust-volume amount="<dB>dB"/> element.
  let audioChildren = '';
  if (el.type === 'audio' || el.type === 'video') {
    const volumeDb = this.gainToDb(el.volume);
    audioChildren += `<adjust-volume amount="${volumeDb}dB"/>`;
    if (el.muted) {
      // Mute is a child <mute start=".." duration=".."/> element covering the full clip.
      audioChildren += `<mute start="0s" duration="${duration}"/>`;
    }
    // Audio fades
    if (el.audioFadeIn) {
      audioChildren += `<fadeIn type="easeInOut" duration="${this.formatTime(el.audioFadeIn, ctx.project.settings.fps)}"/>`;
      // NOTE: fadeIn on audio-channel-source controls fade-in; needs review at implementation time.
    }
    if (el.audioFadeOut) {
      audioChildren += `<fadeOut type="easeInOut" duration="${this.formatTime(el.audioFadeOut, ctx.project.settings.fps)}"/>`;
    }
  }

  // Opacity (for overlays) — see §13 Correction #3.
  // No <adjust-opacity> element exists; use <adjust-blend amount=".."/>.
  let visualChildren = '';
  if (lane > 0 && el.opacity < 1) {
    visualChildren += `<adjust-blend amount="${el.opacity.toFixed(3)}"/>`;
  }
  // Transform
  if (el.transform && (el.transform.scaleX !== 1 || el.transform.scaleY !== 1 ||
                       el.transform.rotation !== 0 || el.transform.centerX !== 0 ||
                       el.transform.centerY !== 0)) {
    visualChildren += `<adjust-transform ` +
      `position="${el.transform.centerX} ${el.transform.centerY}" ` +
      `scale="${el.transform.scaleX} ${el.transform.scaleY}" ` +
      `rotation="${el.transform.rotation}"/>`;
  }

  const children = speedChildren + audioChildren + visualChildren;
  const attrs = `ref="${assetId}" ` +
    `offset="${offset}" start="${start}" duration="${duration}" ` +
    `name="${this.escapeXML(el.name)}" ` +
    `lane="${lane}" ` +
    (el.type === 'audio' ? `audioRole="dialogue" ` : '');

  if (children) {
    return `<asset-clip ${attrs}>${children}</asset-clip>`;
  }
  return `<asset-clip ${attrs}/>`;
}

private gainToDb(gain: number): number {
  if (gain <= 0) return -96;  // effectively silent
  return 20 * Math.log10(gain);
}
```

### 4.5 Transition generation (refined)

```ts
private buildTransition(ctx: ExportContext, transition: TransitionJSON, a: ElementJSON, b: ElementJSON): string {
  // Per DTD:
  //   <!ELEMENT transition (filter-video?, filter-audio?, (%marker_item;)*, metadata?, reserved?)>
  //   <!ATTLIST transition name CDATA #IMPLIED>
  //   <!ATTLIST transition offset %time; #IMPLIED>
  //   <!ATTLIST transition duration %time; #REQUIRED>
  //
  // NOTE (refined — §13 Correction #5): the seed spec used <transition><effect ref="..."/></transition>.
  // That is WRONG. Transitions contain <filter-video> and <filter-audio> children, each pointing to an <effect> resource.
  //
  // The transition overlaps both clips: offset = end-of-clip-A minus half-duration (or per FCP convention).

  const transitionDuration = transition.duration;
  const transitionOffset = a.startTime + a.duration - transitionDuration;
  // ^ Per FCP.cafe example: transition is positioned at the edit point, overlapping both clips.

  // Map transition type to a transition effect resource.
  // The effect is declared in <resources> as <effect id=".." name=".." uid="..."/>.
  // The uid is a path under FCP's template directory.
  // Verified uids (from cutlass Go schema and FCP.cafe examples):
  //   Cross dissolve:  ".../Transitions.localized/Dissolves.localized/Cross Dissolve.effectBundle"
  //   Wipe (any dir): ".../Transitions.localized/Wipes.localized/<Direction> Wipe.effectBundle"
  //   Slide:           ".../Transitions.localized/Movements.localized/Slide.effectBundle"
  // For v1 we only support crossfade. Others ⚠️ DEFERRED — manual verification during implementation.

  let effectName: string;
  let effectUid: string;
  switch (transition.type) {
    case 'crossfade':
      effectName = 'Cross Dissolve';
      effectUid = '.../Transitions.localized/Dissolves.localized/Cross Dissolve.effectBundle';
      break;
    case 'wipe':
    case 'slide':
    case 'iris':
    case 'glitch':
    default:
      // For v1, fall back to Cross Dissolve. Other types require manual verification.
      effectName = 'Cross Dissolve';
      effectUid = '.../Transitions.localized/Dissolves.localized/Cross Dissolve.effectBundle';
  }

  const effId = ctx.effectIds.get(effectName) ?? this.declareEffect(ctx, effectName, effectUid);

  return `<transition name="${effectName}" ` +
    `offset="${this.formatTime(transitionOffset, ctx.project.settings.fps)}" ` +
    `duration="${this.formatTime(transitionDuration, ctx.project.settings.fps)}">` +
    `<filter-video ref="${effId}" name="${effectName}"/>` +
    `<filter-audio ref="${effId}" name="${effectName} (Audio)"/>` +
    `</transition>`;
}
```

### 4.6 Text/title generation (refined)

```ts
private buildNonAssetClip(ctx: ExportContext, el: ElementJSON, lane: number): string {
  if (el.type === 'text') {
    // Per DTD:
    //   <!ELEMENT title (param*, text*, text-style-def*, note?, %intrinsic-params-video;, (%anchor_item;)*, (%marker_item;)*, (%video_filter_item;)*, metadata?)>
    //   <!ATTLIST title ref IDREF #REQUIRED>     <!-- 'effect' ID for a Motion template -->
    //   <!ATTLIST title %clip_attrs;>            <!-- lane, offset, name, start, duration, enabled -->
    //   <!ATTLIST title role CDATA #IMPLIED>
    //
    // Title REQUIRES a ref to an <effect> Motion template. We use FCP's built-in "Basic Title".
    const titleEffId = ctx.effectIds.get('Basic Title') ??
      this.declareEffect(ctx, 'Basic Title',
        '.../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti');

    const offset = this.formatTime(el.startTime, ctx.project.settings.fps);
    const duration = this.formatTime(el.duration, ctx.project.settings.fps);
    const textContent = (el as any).params?.text || 'Text';

    // Text content + inline text-style-def
    const textStyleId = `ts1`;
    const fontFamily = (el as any).params?.fontFamily || 'Helvetica Neue';
    const fontSize = (el as any).params?.fontSize || 48;
    const fontColor = this.colorToFCPString((el as any).params?.color ?? { r: 1, g: 1, b: 1, a: 1 });
    const alignment = (el as any).params?.alignment || 'center';

    return `<title ref="${titleEffId}" name="${this.escapeXML(el.name)}" ` +
      `offset="${offset}" duration="${duration}" ` +
      `lane="${lane}" role="titles">` +
      `<text><text-style ref="${textStyleId}">${this.escapeXML(textContent)}</text-style></text>` +
      `<text-style-def id="${textStyleId}">` +
      `<text-style font="${fontFamily}" fontSize="${fontSize}" ` +
      `fontColor="${fontColor}" alignment="${alignment}"/>` +
      `</text-style-def>` +
      `</title>`;
  }

  if (el.type === 'shape') {
    // Shape elements: FCPXML has limited shape support via generator clips referencing Motion templates.
    // Workaround: render the shape to an image, treat as image asset.
    // ⚠️ DEFERRED — manual verification during implementation.
    return `<!-- Shape not directly supported, requires image export -->`;
  }

  return `<!-- Unsupported element type: ${el.type} -->`;
}

private colorToFCPString(c: { r: number; g: number; b: number; a: number }): string {
  // FCPXML color format: "r g b a" with values 0..1 (space-separated).
  return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} ${c.a.toFixed(3)}`;
}
```

### 4.7 Marker generation (refined)

```ts
private buildMarkers(ctx: ExportContext, parentEl: ElementJSON): string {
  // Markers are CHILDREN of clips (asset-clip, audio, video, title, gap, etc.) — not standalone.
  // Per DTD:
  //   <!ELEMENT marker EMPTY>
  //   <!ATTLIST marker start %time; #REQUIRED>     <!-- position within parent clip's local timeline -->
  //   <!ATTLIST marker duration %time; #IMPLIED>
  //   <!ATTLIST marker value CDATA #REQUIRED>     <!-- marker text -->
  //   <!ATTLIST marker completed CDATA #IMPLIED>  <!-- 0 or 1 -->
  //   <!ATTLIST marker note CDATA #IMPLIED>
  //
  // Chapter markers: same shape but element name is <chapter-marker>, with extra posterOffset.
  // Analysis markers: <analysis-marker start=".." duration=".." type=".."/> — auto-generated by FCP.

  if (ctx.project.markers.length === 0) return '';

  // Find markers within this clip's time range
  const fps = ctx.project.settings.fps;
  const clipStart = parentEl.startTime;
  const clipEnd = parentEl.startTime + parentEl.duration;
  const markersInClip = ctx.project.markers.filter(m => m.time >= clipStart && m.time < clipEnd);

  return markersInClip.map(m => {
    // 'start' here is RELATIVE to the clip's local timeline (parentEl.sourceStart = 0 if not retimed).
    const localStart = m.time - clipStart;
    return `<marker start="${this.formatTime(localStart, fps)}" ` +
      `duration="${this.formatOneFrame(fps)}" ` +
      `value="${this.escapeXML(m.label || 'Marker')}"/>`;
  }).join('\n');
}

private formatOneFrame(fps: FrameRate): string {
  // 1 frame as rational time: "1/30s" for 30fps, "1001/30000s" for 29.97fps
  if (fps.numerator === 1001) {
    return `1001/${fps.denominator}s`;  // NTSC
  }
  return `1/${fps.numerator}s`;
}
```

### 4.8 Time formatting

FCPXML times are rational: `numerator/denominator s` (e.g., `3000/30000s` for 30fps frame 100).

```ts
private formatTime(time: MediaTime, fps: FrameRate): string {
  // Convert MediaTime (120,000 ticks/sec) to FCPXML rational time.
  // FCPXML uses the project's fps as the denominator.

  const ticksPerFrame = Math.round(TICKS_PER_SECOND * fps.denominator / fps.numerator);
  const frames = Math.round(time / ticksPerFrame);

  // Reduce fraction (e.g., 60/30 → 2/1)
  const reduced = this.reduceFraction(frames, fps.numerator);

  if (reduced.denominator === 1) {
    return `${reduced.numerator}s`;
  }
  return `${reduced.numerator}/${reduced.denominator}s`;
}

private formatFrameDuration(fps: FrameRate): string {
  // For NTSC: "1001/30000s" (29.97fps)
  // For non-NTSC: "100/<fps*100>s" → "100/3000s" (30fps)
  if (fps.numerator === 1001) {
    return `1001/${fps.denominator}s`;
  }
  return `100/${fps.numerator * 100}s`;
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

Alternative: use FCPXML bundle (`.fcpxmld` directory) with `Media/` subdirectory + `Info.plist`. See §11.4 for bundle layout.

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

### 6.1 DTD validation (refined — see §13 Correction #6)

**Apple ships FCPXML as a DTD, not an XSD.** The DTD for v1.10 is `FCPXMLv1_10.dtd` (785 lines, Apple copyright 2011–2021), mirrored in the CommandPost GitHub repo:

```
https://raw.githubusercontent.com/CommandPost/CommandPost/develop/src/extensions/cp/apple/fcpxml/dtd/FCPXMLv1_10.dtd
```

Every FCPXML file declares `<!DOCTYPE fcpxml>` in the header (visible in the FCP.cafe examples — see §12).

Validation approaches (see §14 for the recommendation):

```ts
// Browser: use a pure-JS DTD validator. Options:
//   - xml-xsd-validator-browser@1.0.9 (despite the name, supports DTD too)
//   - Or bundle the DTD and use a small custom validator (DTDs are simpler than XSDs)
//   - Or use xmllint-wasm (heavier but authoritative)

// Cloud render (Node.js): use libxmljs2 with DTD validation:
//   import libxml from 'libxmljs2';
//   const xsd = libxml.parseXml(fcpXmlStr);
//   const dtd = libxml.parseXmlDTD(dtdString);
//   xsd.validate(dtd);  // returns true/false, xsd.validationErrors for messages
```

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
- We can include a LUT in the FCPXML (`<filter-video>` referencing a `.cube` file) that approximates our grade

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
- ❌ **Audio EQ.** Per-track EQ settings. (FCPXML 1.10 supports `<adjust-EQ>` with predefined modes like `voice_enhance`, `music_enhance` — but custom EQ bands require Motion templates.)
- ❌ **Animation keyframes for transforms.** FCPXML supports keyframes via `<keyframeAnimation>` for any `<param>` (DTD lines 195-202), so this is actually feasible. Implementation ⚠️ DEFERRED to v2.
- ❌ **Multi-camera angles.** Deferred to v2.
- ❌ **Subtitles/captions.** FCPXML 1.10 has `<caption>` support, but our project model doesn't yet.

### 8.2 The "include a LUT" workaround for color

If the user has applied color grading in our editor, we can:
1. Render a frame with the grade applied
2. Compare to the original frame
3. Generate a 3D LUT that approximates the grade (using a tool like `generate-lut-from-grade`)
4. Include the LUT in the FCPXML as a `<filter-video>` referencing an `<effect>` resource pointing to the `.cube` file

⚠️ DEFERRED — research the exact `<effect>` UID for a Custom LUT effect at implementation time.

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

## 10. Open Questions — Answered by SCOUT-10-RETRY

> The seed spec's §10 listed 11 open questions. Below is each question with a concrete answer backed by the cited source. Questions marked **⚠️ DEFERRED** are out of scope for v1 implementation and should be revisited at the appropriate phase.

### Q1. FCPXML 1.10 specification source

**Answer:** The official Apple documentation lives at `https://developer.apple.com/documentation/professional-video-applications/fcpxml-reference` (the seed's URL `finalcutproxreferencedocumentation` returns 404 — Apple renamed it). Apple publishes the spec as a **DTD (Document Type Definition)**, not an XSD. The DTD file is bundled with Final Cut Pro and also mirrored in the CommandPost GitHub repo at `src/extensions/cp/apple/fcpxml/dtd/FCPXMLv1_10.dtd` (785 lines, header reads "FCP XML Interchange Format, Version 1.10 / Copyright (c) 2011-2021 Apple Inc.").

**Reference:** [Apple FCPXML Reference](https://developer.apple.com/documentation/professional-video-applications/fcpxml-reference), [CommandPost DTD mirror](https://github.com/CommandPost/CommandPost/tree/develop/src/extensions/cp/apple/fcpxml/dtd), [FCP.cafe curated guide](https://fcp.cafe/developers/fcpxml/).

### Q2. Real-world FCPXML examples

**Answer:** FCP.cafe publishes three real FCPXML 1.11 exports (1.10 and 1.11 share the relevant DTD structure) with annotations:
1. Sync clip with gap and audio clip in a lane (1920×1080 @ 25fps).
2. Standalone sync clip with trimmed start.
3. Multicam clip with multiple angles and audio roles.

These show the canonical patterns for: spine + gap, anchored `<asset-clip lane="-1">` for audio, `tcStart`/`tcFormat`/`audioLayout`/`audioRate` on `<sequence>`, `<media-rep>` with `file://` URLs, and `<conform-rate>` for frame-rate conversion.

**Reference:** [FCP.cafe FCPXML guide](https://fcp.cafe/developers/fcpxml/) — three annotated `.fcpxml` examples.

### Q3. DaVinci Resolve FCPXML import behavior

**Answer:** ⚠️ DEFERRED — manual verification needed during implementation. Resolve officially supports FCPXML 1.x import (current Resolve 19 supports up to 1.11); specific color space mapping rules and Resolve-specific extensions require running a test import in Resolve.

### Q4. Premiere Pro FCPXML import behavior

**Answer:** ⚠️ DEFERRED — manual verification needed during implementation. Premiere Pro supports FCPXML import via File → Import, but documented version support and color mapping require a test import.

### Q5. Existing FCPXML TypeScript libraries

**Answer:** npm search returned 14 packages with "fcpxml" in the name or description. The most relevant for our use case:

| Package | Purpose | Adopt? |
|---|---|---|
| `@bbc/fcpx-xml-composer@1.1.1` | Convert a JSON sequence into FCPX XML | No (BBC-internal API, narrow scope) |
| `@trendyvideo/nle-export@1.0.8` | Export Remotion timelines to NLE XML formats (FCPXML, XMEML) | No (Remotion-specific) |
| `@chatoctopus/timeline@0.3.0` | Cross-NLE import/export (Final Cut, Premiere, DaVinci) | Maybe (evaluate at impl time — broadest scope) |
| `bmjs-fcpxml@1.1.7` | Utility for generating FCP XML files | No (small surface) |
| `ossclip@0.1.27` | Local-first CLI video producer with FCPXML output | No (opinionated workflow) |
| `davinci-slide-builder@1.2.1` | Slideshow timeline builder in FCP XML | No (slideshow only) |
| `m2s@1.1.0` | FCPXML markers → stills | No (read-only) |
| `srt2fcpx`, `srt2fcpxml`, `subkit`, `subkit-cli`, `srt2subtitles` | SRT ↔ FCPXML conversion | No (subtitle scope) |
| `@purplesquirrel/finalcut-mcp`, `venice-video-mcp`, `fcptrim` | MCP / CLI wrappers | No |

None of these is a comprehensive TypeScript schema library comparable to [cutlass](https://github.com/andrewarrow/cutlass) (Go) or [reuelk/pipeline](https://github.com/reuelk/pipeline) (Swift). **Adoption decision:** write our own Zod schema based on the DTD (§11 documents the element/attribute list). The DTD is small enough (785 lines) that we can hand-translate it to Zod in a day.

**Reference:** [npm search "fcpxml"](https://registry.npmjs.org/-/v1/search?text=fcpxml&size=25), [npm search "final-cut-pro-xml"](https://registry.npmjs.org/-/v1/search?text=final-cut-pro-xml&size=25), [cutlass Go reference](https://github.com/andrewarrow/cutlass), [reuelk/pipeline Swift reference](https://github.com/reuelk/pipeline).

### Q6. Apple's FCPXML 1.10 XSD

**Answer:** **There is no XSD.** Apple publishes only a DTD (`FCPXMLv1_10.dtd`). The seed spec's assumption that an XSD exists at `https://developer.apple.com/sample-code/av/fcpxml/FCPXML_1_10.xsd` was incorrect — that URL returns HTTP 403.

The DTD is the authoritative schema. It defines:
- All valid elements (via `<!ELEMENT>` declarations).
- All valid attributes (via `<!ATTLIST>` declarations).
- Parent-child relationships (via content model in `<!ELEMENT>`).
- Required vs. optional (via `#REQUIRED` / `#IMPLIED`).
- Enumerated values where applicable (via `(a | b | c)` syntax).

What DTDs do NOT define (and we must enforce via Zod ourselves):
- Type checking on values (DTD uses `CDATA` for almost everything; no integer/range checks).
- Cross-references (DTD uses `IDREF` but doesn't validate target existence until parse time).
- The valid string values for `colorSpace` triplets (DTD declares it as `CDATA`, but Apple's docs list the well-known triplets — see §11.2).
- Rational time format (DTD accepts any `CDATA`; we must validate the `N/D s` regex).

### Q7. LUT-in-FCPXML pattern

**Answer:** ⚠️ DEFERRED — manual verification during implementation. Apple's DTD declares `<asset customLUTOverride="...">` for built-in camera Log modes (e.g., `64 (Panasonic_VLog_VGamut)`) and custom LUT files (e.g., `LUT:f9814a42eb75c58d9d9dc2a5344bd423 (Custom-LUT)`). Embedding a 3D LUT as an applied `<filter-video>` effect requires knowing the FxPlug/Motion-template UID for FCP's "Custom LUT" effect, which is not documented in the public DTD. v1 will skip LUT embedding (§8.2).

### Q8. Color space string values — verified

**Answer:** Per Apple's DTD comment (lines 70-73 of `FCPXMLv1_10.dtd`) and the official asset doc:

The `colorSpace` attribute on `<format>` (and `colorSpaceOverride` on `<asset>`) takes a **triplet string** of the form `"<cp>-<tc>-<mc> (<name>)"` per ISO/IEC 23001-8, where:
- `<cp>` = color primaries
- `<tc>` = transfer characteristics
- `<mc>` = matrix coefficients
- `(<name>)` = optional human-readable name (Apple's exporter adds it on export; importer ignores it)

The six well-known triplets documented by Apple:

| Triplet | Name | Our `MediaColorInfo` mapping |
|---|---|---|
| `1-1-1 (Rec. 709)` | Rec. 709 (SDR) | `primaries: 'bt709'`, `transfer: 'bt709'` or `'srgb'` |
| `6-1-6 (Rec. 601 NTSC)` | Rec. 601 NTSC (SD) | `primaries: 'smpte-c'` (NTSC) |
| `5-1-6 (Rec. 601 PAL)` | Rec. 601 PAL (SD) | `primaries: 'smpte-c'` (PAL) |
| `9-1-9 (Rec. 2020)` | Rec. 2020 (SDR wide gamut) | `primaries: 'bt2020'`, `transfer: 'bt709'` |
| `9-16-9 (Rec. 2020 PQ)` | Rec. 2020 with SMPTE ST 2084 PQ (HDR) | `primaries: 'bt2020'`, `transfer: 'pq'` |
| `9-18-9 (Rec. 2020 HLG)` | Rec. 2020 with BT.2100 HLG (HDR) | `primaries: 'bt2020'`, `transfer: 'hlg'` |

**Additional values for still images only (as `colorSpaceOverride` on `<asset>`):**
- `sRGB IEC61966-2.1`
- `Adobe RGB (1998)`

**Seed spec corrections:**

- ❌ Seed spec claimed `"Display P3"` is a valid FCPXML 1.10 colorSpace value — **incorrect**. Apple's 1.10 DTD does not list Display P3 among the well-known triplets. Display P3 support requires FCPXML 1.11+ (introduced with FCP 10.6). For 1.10 compatibility, Display P3 media must fall back to `1-1-1 (Rec. 709)` (with a runtime warning) or use the experimental raw triplet `8-1-8 (Display P3)` (unverified — manual test needed).
- ❌ Seed spec claimed `"sRGB"` is a valid colorSpace value — **incorrect as a triplet**. The correct value for sRGB still images is the full string `sRGB IEC61966-2.1` (used as `colorSpaceOverride` on `<asset>`, not as `colorSpace` on `<format>`).
- ❌ Seed spec placed `colorSpace` on `<asset>` — **incorrect**. The DTD puts `colorSpace` on `<format>`; per-asset override uses `colorSpaceOverride`.

**Reference:** [Apple asset documentation](https://developer.apple.com/documentation/professional-video-applications/asset) (Well-Known Color Space Triplets table), [Apple format documentation](https://developer.apple.com/documentation/professional-video-applications/format), DTD lines 70-73 of `FCPXMLv1_10.dtd`.

### Q9. Text style resources

**Answer:** Per the DTD, `<title>` elements contain `<text>`, `<text-style-def>`, and `<text-style>` children:

```xml
<elementDecl> <!ELEMENT title (param*, text*, text-style-def*, note?, %intrinsic-params-video;, (%anchor_item;)*, (%marker_item;)*, (%video_filter_item;)*, metadata?)>
<attlistDecl> <!ATTLIST title ref IDREF #REQUIRED>     <!-- 'effect' ID for a Motion template -->
              <!ATTLIST title %clip_attrs;>           <!-- lane, offset, name, start, duration, enabled -->
              <!ATTLIST title role CDATA #IMPLIED>

<elementDecl> <!ELEMENT text (#PCDATA | text-style)*>
<attlistDecl> <!ATTLIST text alignment (left | center | right) #IMPLIED>
              <!-- (plus caption-only attrs: display-style, roll-up-height, position, placement) -->

<elementDecl> <!ELEMENT text-style-def (text-style)>
<attlistDecl> <!ATTLIST text-style-def id ID #REQUIRED>
              <!ATTLIST text-style-def name CDATA #IMPLIED>

<elementDecl> <!ELEMENT text-style (#PCDATA | param)*>
<attlistDecl> <!-- All optional, all CDATA except alignment and bold/italic/underline -->
              font, fontSize, fontFace, fontColor (format: "r g b a" 0..1), backgroundColor,
              bold (0|1), italic (0|1), strokeColor, strokeWidth, baseline, shadowColor,
              shadowOffset, shadowBlurRadius, kerning,
              alignment (left | center | right | justified), lineSpacing, tabStops,
              baselineOffset, underline (0|1)
```

**Required:** `<title>` must reference an `<effect>` (Motion template) via `ref`. The built-in "Basic Title" effect uses UID `.../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti`.

**Pattern (from FCP.cafe examples):**
```xml
<title ref="r10" name="Opening Title" offset="0s" duration="120120/24000s">
  <text>
    <text-style ref="ts1">Welcome to the Show</text-style>
  </text>
  <text-style-def id="ts1">
    <text-style font="Helvetica Neue" fontSize="72" fontFace="Bold"
                fontColor="1 1 1 1" alignment="center"/>
  </text-style-def>
</title>
```

**Reference:** DTD lines 537-575 of `FCPXMLv1_10.dtd`, Apple title documentation, FCP.cafe example 3.

### Q10. Transition effect IDs

**Answer:** FCPXML transitions use `<filter-video ref=".."/>` and `<filter-audio ref=".."/>` to reference `<effect>` resources declared in `<resources>`. The `<effect>` element's `uid` attribute is a path under FCP's Motion template directory (not a simple `FFColorCrossDissolve` string as the seed spec guessed).

```xml
<!-- In <resources>: -->
<effect id="r5" name="Cross Dissolve"
        uid=".../Transitions.localized/Dissolves.localized/Cross Dissolve.effectBundle"/>

<!-- In <spine> between two clips: -->
<transition name="Cross Dissolve" offset="108108/24000s" duration="24024/24000s">
  <filter-video ref="r5" name="Cross Dissolve"/>
  <filter-audio ref="r5" name="Cross Dissolve (Audio)"/>
</transition>
```

The seed spec's `<transition><effect ref="...FFColorCrossDissolve"/></transition>` was wrong on two counts: (a) transitions contain `<filter-video>`/`<filter-audio>`, not `<effect>`; (b) the `FFColorCrossDissolve` identifier is not the format FCPXML uses (that's an internal FxPlug identifier; the public UID is the `.effectBundle` path).

Verified effect UIDs (from cutlass Go schema docs and FCP.cafe examples):
- Cross Dissolve: `.../Transitions.localized/Dissolves.localized/Cross Dissolve.effectBundle`
- Wipe: `.../Transitions.localized/Wipes.localized/<Direction> Wipe.effectBundle`
- Slide: `.../Transitions.localized/Movements.localized/Slide.effectBundle`

⚠️ The exact `<Direction> Wipe` filenames and the slide variants require manual verification in a real FCP install at implementation time.

**Reference:** DTD lines 584-588 of `FCPXMLv1_10.dtd`, Apple transition documentation, cutlass Go README.

### Q11. Browser-side XSD validation

**Answer:** This question is moot — Apple uses DTD, not XSD. See §14 for the full recommendation.

For DTD validation in the browser:
- `xml-xsd-validator-browser@1.0.9` (npm) — despite the name, supports DTDs via `xs:include`/`xs:redefine`/`xs:import`; pure JS, browser-compatible.
- `xmllint` compiled to WASM — authoritative (it's literally libxml2), but ~1 MB bundle.
- `libxmljs2` — Node.js only, suitable for the cloud render server.
- Hand-rolled Zod schema — we control semantics, ~1 day's work given the DTD is 785 lines.

**Recommendation:** use Zod schema validation in the browser (semantic correctness — our schema enforces types, enums, and cross-refs the DTD can't), and optional server-side `xmllint --dtdvalid FCPXMLv1_10.dtd` for authoritative DTD validation. See §14.

**Reference:** [npm search "xsd validator"](https://registry.npmjs.org/-/v1/search?text=xsd+validator&size=25).

---

## 11. FCPXML 1.10 Schema Reference

This section is a hand-distilled reference of the elements and attributes our exporter touches, sourced from `FCPXMLv1_10.dtd`. The DTD itself is the authoritative source. Every entry below maps to a `<!ELEMENT>` or `<!ATTLIST>` declaration in the DTD (line numbers cited where helpful).

### 11.1 Document root and hierarchy

```
fcpxml (import-options?, resources?, (library | event* | (%event_item;)*))
  └ version CDATA #FIXED "1.10"                (must be exactly "1.10")
```

Hierarchy: `library → event → project → sequence → spine → clip items / transitions`.

- `<library location=".." colorProcessing="(standard|wide|wide-hdr)">` — root, optional `colorProcessing` for HDR library mode.
- `<event name=".." uid="..">` — container.
- `<project name=".." uid=".." id=".." modDate="..">` — contains exactly one `<sequence>`.
- `<sequence %media_attrs; audioLayout=(mono|stereo|surround) audioRate=%audioHz; renderFormat keywords>` — the timeline.

### 11.2 Resources (defined once, referenced by ID)

```xml
<resources>
  <format .../>        <!-- Video format (resolution, fps, color space) -->
  <asset ...>...</asset>   <!-- Media file -->
  <effect .../>       <!-- Motion template / FxPlug (for transitions and titles) -->
  <media ...>...</media>   <!-- Compound or multicam clip definition -->
  <locator ...>...</locator>  <!-- URL-based resource -->
</resources>
```

#### `<format>` (DTD lines 60-76)

```xml
<format id ID #REQUIRED
        name CDATA #IMPLIED               (predefined name like "FFVideoFormat1080p30")
        frameDuration %time; #IMPLIED    (e.g. "100/3000s" for 30fps, "1001/30000s" for 29.97)
        fieldOrder CDATA #IMPLIED         ("progressive" | "upper first" | "lower first")
        width CDATA #IMPLIED
        height CDATA #IMPLIED
        paspH CDATA #IMPLIED              (pixel aspect ratio)
        paspV CDATA #IMPLIED
        colorSpace CDATA #IMPLIED         ("<cp>-<tc>-<mc> (<name>)" per ISO/IEC 23001-8)
        projection CDATA #IMPLIED         ("none"|"equirectangular"|"fisheye"|"back-to-back fisheye"|"cubic")
        stereoscopic CDATA #IMPLIED      ("mono"|"side by side"|"over under")/>
```

Valid colorSpace triplets (well-known, per DTD comment):

| Triplet | Name |
|---|---|
| `1-1-1 (Rec. 709)` | Rec. 709 (SDR) |
| `6-1-6 (Rec. 601 NTSC)` | NTSC SD |
| `5-1-6 (Rec. 601 PAL)` | PAL SD |
| `9-1-9 (Rec. 2020)` | Rec. 2020 SDR |
| `9-16-9 (Rec. 2020 PQ)` | Rec. 2020 HDR PQ |
| `9-18-9 (Rec. 2020 HLG)` | Rec. 2020 HDR HLG |

`Display P3` is **not** a documented well-known triplet in v1.10. See §10 Q8 and §13 Correction #4.

#### `<asset>` (DTD lines 81-104)

```xml
<asset id ID #REQUIRED
       name CDATA #IMPLIED
       uid CDATA #IMPLIED                    (UUID or reverse-DNS string; FCP reserves uppercase-hex strings)
       start %time; #IMPLIED
       duration %time; #IMPLIED             (use "0s" for still images)
       hasVideo CDATA #IMPLIED              ("1" or "0")
       format IDREF #IMPLIED                (references <format>)
       hasAudio CDATA #IMPLIED             ("1" or "0")
       videoSources CDATA #IMPLIED
       audioSources CDATA #IMPLIED
       audioChannels CDATA #IMPLIED
       audioRate CDATA #IMPLIED
       customLUTOverride CDATA #IMPLIED     (built-in log ID or "LUT:<id> (<name>)")
       colorSpaceOverride CDATA #IMPLIED   (same format as <format>'s colorSpace; plus "sRGB IEC61966-2.1" / "Adobe RGB (1998)" for stills)
       projectionOverride CDATA #IMPLIED
       stereoscopicOverride CDATA #IMPLIED
       auxVideoFlags CDATA #IMPLIED>
  <media-rep kind="(original-media|proxy-media)" sig CDATA #IMPLIED
             src CDATA #REQUIRED
             suggestedFilename CDATA #IMPLIED>
    <bookmark/>?
  </media-rep>+
  <metadata>?
</asset>
```

**Critical:** `colorSpace` does **not** exist as an attribute of `<asset>`. Use `colorSpaceOverride` only when the asset's color space differs from the format's color space. The asset inherits its format's color space by default.

#### `<effect>` (DTD lines 126-130)

```xml
<effect id ID #REQUIRED
        name CDATA #IMPLIED
        uid CDATA #REQUIRED          (Motion template path, FxPlug ID, AU ID, or audio effect bundle name)
        src CDATA #IMPLIED/>         (URL for customized Motion template file)
```

#### `<media>` and `<locator>` — not used in v1 (multicam/compound clips deferred).

### 11.3 Story elements (DTD lines 410-535)

#### `<spine>` (DTD line 412)

```xml
<spine (%clip_item; | transition)*
       lane CDATA #IMPLIED
       offset %time; #IMPLIED
       name CDATA #IMPLIED
       format IDREF #IMPLIED>          (default is same as parent)
```

#### `<asset-clip>` (DTD lines 493-504)

```xml
<asset-clip ref IDREF #REQUIRED          ('asset' ID)
            %clip_attrs_with_optional_duration;   (lane, offset, name, start, duration [optional], enabled)
            srcEnable (all | audio | video) "all"
            audioStart %time; #IMPLIED
            audioDuration %time; #IMPLIED
            format IDREF #IMPLIED               (default: same as parent)
            tcStart %time; #IMPLIED
            tcFormat (DF | NDF) #IMPLIED
            modDate CDATA #IMPLIED
            audioRole CDATA #IMPLIED
            videoRole CDATA #IMPLIED            (default: "video")>

  <!-- Children (in order): -->
  <note>?
  <!-- timing-params: -->
  <conform-rate scaleEnabled=(0|1) srcFrameRate=(23.98|24|25|29.97|30|60|47.95|48|50|59.94)
                frameSampling=(floor|nearest-neighbor|frame-blending|optical-flow-classic|optical-flow)>?
  <timeMap frameSampling preservesPitch=(0|1)>
    <timept time value interp=(smooth2|linear|smooth) inTime? outTime?>*
  </timeMap>?
  <!-- intrinsic-params (visual + audio): -->
  <object-tracker>? <adjust-crop>? <adjust-corners>? <adjust-conform>?
  <adjust-transform>? <adjust-blend>? <adjust-stabilization>?
  <adjust-rollingShutter>? <adjust-360-transform>? <adjust-reorient>?
  <adjust-orientation>? <adjust-cinematic>?
  <adjust-volume>? <adjust-panner>?
  <!-- anchored items (lanes ≠ 0): -->
  (%anchor_item;)*                        (audio | video | clip | title | caption | mc-clip | ref-clip | sync-clip | asset-clip | audition | spine)
  <!-- markers -->
  (%marker_item;)*                       (marker | chapter-marker | rating | keyword | analysis-marker)
  <!-- audio channel sources -->
  <audio-channel-source>*
  <!-- video filters -->
  (filter-video | filter-video-mask)*
  <!-- audio filters -->
  <filter-audio>*
  <metadata>?
</asset-clip>
```

**Verified attributes the seed spec asked about:**

| Seed attribute | In DTD? | Notes |
|---|---|---|
| `offset` | ✅ yes (via `%ao_attrs`) | Position in parent timeline. Default `0s`. |
| `start` | ✅ yes (via `%clip_attrs_with_optional_duration`) | Source in-point. Default `0s`. |
| `duration` | ✅ yes (optional for asset-clip — defaults to asset duration) | Timeline extent. |
| `ref` | ✅ yes (#REQUIRED) | Asset resource ID. |
| `lane` | ✅ yes (via `%ao_attrs`) | 0=spine, >0=above, <0=below. |
| `timeScale` | ❌ **does not exist** | Speed is via child `<timeMap>` or `<conform-rate>`. See §13 Correction #1. |
| `enabled` | ✅ yes (default `"1"`) | Visibility toggle. |
| `volume` | ❌ **does not exist as attribute** | Volume is via child `<adjust-volume amount="<dB>dB"/>`. See §13 Correction #2. |

#### `<audio>` (DTD lines 507-513) — preferred for standalone audio clips

```xml
<audio ref IDREF #REQUIRED
       %clip_attrs;                    (lane, offset, name, start, duration #REQUIRED, enabled)
       srcID CDATA #IMPLIED
       role CDATA #IMPLIED
       srcCh CDATA #IMPLIED            (comma-separated source channel indices, 1-based)
       outCh CDATA #IMPLIED>           (comma-separated output channels: L,R,C,LFE,Ls,Rs,X)
  <note>? <timing-params>?
  <adjust-volume amount CDATA "0dB">?
  (%anchor_item;)* (%marker_item;)* <filter-audio>*
</audio>
```

#### `<video>` (DTD lines 516-520) — for generators, shapes, images

```xml
<video ref IDREF #REQUIRED
       %clip_attrs;
       srcID CDATA #IMPLIED
       role CDATA #IMPLIED            (default "video")>
  <param>* <note>? <timing-params>?
  %intrinsic-params-video;
  (%anchor_item;)* (%marker_item;)* (filter-video | filter-video-mask)* <reserved>?
</video>
```

#### `<gap>` (DTD lines 529-534)

```xml
<gap name CDATA #IMPLIED
     offset %time; #IMPLIED
     start %time; #IMPLIED
     duration %time; #REQUIRED
     enabled (0|1) "1">
  <note>? (%anchor_item;)* (%marker_item;)* <metadata>?
</gap>
```

#### `<title>` (DTD lines 537-540) — see §10 Q9 for full structure

```xml
<title ref IDREF #REQUIRED          <!-- 'effect' ID for a Motion template -->
       %clip_attrs;
       role CDATA #IMPLIED>
  <param>* <text>* <text-style-def>* <note>?
  %intrinsic-params-video;
  (%anchor_item;)* (%marker_item;)* (filter-video | filter-video-mask)* <metadata>?
</title>
```

#### `<transition>` (DTD lines 584-588)

```xml
<transition name CDATA #IMPLIED
            offset %time; #IMPLIED
            duration %time; #REQUIRED>
  <filter-video ref IDREF #REQUIRED name CDATA #IMPLIED enabled (0|1) "1">
    <data>* <param>*
  </filter-video>?
  <filter-audio ref IDREF #REQUIRED name CDATA #IMPLIED enabled (0|1) "1" presetID CDATA #IMPLIED>
    <data>? <param>*
  </filter-audio>?
  (%marker_item;)* <metadata>? <reserved>?
</transition>
```

**Critical:** transitions contain `<filter-video>` and `<filter-audio>` children (not `<effect>` directly). See §13 Correction #5.

### 11.4 Timing system (DTD lines 9, 144-181)

Time values are rational seconds: `"<num>/<denom>s"` with 64-bit numerator, 32-bit denominator. Whole seconds may be written without a denominator (`"5s"`).

```xml
<!ENTITY % time "CDATA">
```

Frame durations by fps (from FCP.cafe + Apple docs):

| fps | `frameDuration` value |
|---|---|
| 23.976 | `1001/24000s` |
| 24 | `100/2400s` |
| 25 | `100/2500s` |
| 29.97 | `1001/30000s` |
| 30 | `100/3000s` |
| 50 | `100/5000s` |
| 59.94 | `1001/60000s` |
| 60 | `100/6000s` |

`tcFormat`: `"DF"` (drop frame) or `"NDF"` (non-drop). Default `"NDF"`.

`audioRate`: `"32k"`, `"44.1k"`, `"48k"`, `"88.2k"`, `"96k"`, `"176.4k"`, `"192k"`.

### 11.5 Adjustment elements (DTD lines 251-353)

| Element | Purpose | Key attributes |
|---|---|---|
| `<adjust-transform>` | Position, scale, rotation, anchor | `position="X Y"`, `scale="X Y"`, `rotation="deg"`, `anchor="X Y"`, `enabled` |
| `<adjust-crop>` | Crop/trim/pan | `mode=(trim|crop|pan)`, `enabled` |
| `<adjust-corners>` | Corner pinning | `botLeft/topLeft/topRight/botRight="X Y"` |
| `<adjust-conform>` | Pixel aspect ratio | `type=(fit|fill|none)` |
| `<adjust-blend>` | Opacity + blend mode | `amount="0..1"`, `mode` |
| `<adjust-stabilization>` | Video stabilization | `type=(automatic|inertiaCam|smoothCam)` |
| `<adjust-rollingShutter>` | Rolling shutter fix | `amount=(none|low|medium|high|extraHigh)` |
| `<adjust-360-transform>` | 360° video | many spherical/cartesian attrs |
| `<adjust-reorient>` | Tiny planet reorient | tilt/pan/roll |
| `<adjust-orientation>` | Image rotation | tilt/pan/roll/fieldOfView |
| `<adjust-cinematic>` | Cinematic mode | aperture, dataLocator |
| `<adjust-volume>` | Audio volume | `amount="<dB>dB"` (default `"0dB"`) |
| `<adjust-panner>` | Audio panning | `mode`, `amount`, surround widths |
| `<adjust-EQ>` | Audio EQ (predefined modes) | `mode=(flat|voice_enhance|music_enhance|loudness|hum_reduction|bass_boost|bass_reduce|treble_boost|treble_reduce)` |
| `<adjust-loudness>` | Loudness correction | `amount`, `uniformity` |
| `<adjust-noiseReduction>` | Audio denoise | `amount` |
| `<adjust-humReduction>` | Hum removal | `frequency=(50|60)` |
| `<adjust-matchEQ>` | Match EQ | `<data>` child |

**Note:** there is **no** `<adjust-opacity>` element. Use `<adjust-blend amount="0..1"/>`.

### 11.6 Speed/retiming elements (DTD lines 632-650)

```xml
<conform-rate scaleEnabled=(0|1) "1"
              srcFrameRate=(23.98|24|25|29.97|30|60|47.95|48|50|59.94)
              frameSampling=(floor|nearest-neighbor|frame-blending|optical-flow-classic|optical-flow) "floor"/>

<timeMap frameSampling preservesPitch=(0|1) "1">
  <timept time %time; #REQUIRED             <!-- new adjusted clip time -->
           value CDATA #REQUIRED            <!-- original clip time -->
           interp=(smooth2|linear|smooth) "smooth2"
           inTime %time; #IMPLIED           <!-- for smooth interpolations -->
           outTime %time; #IMPLIED/>*
</timeMap>
```

**Speed change patterns:**

- Constant 2× speed (5s timeline = 10s source):
  ```xml
  <timeMap>
    <timept time="0s" value="0s"/>
    <timept time="5s" value="10s"/>
  </timeMap>
  ```

- Constant 0.5× speed (10s timeline = 5s source):
  ```xml
  <timeMap>
    <timept time="0s" value="0s"/>
    <timept time="10s" value="5s"/>
  </timeMap>
  ```

- Frame-rate conform (e.g., 25fps source in 24fps timeline):
  ```xml
  <conform-rate srcFrameRate="25" frameSampling="frame-blending"/>
  ```

### 11.7 Marker, rating, keyword elements (DTD lines 655-680)

```xml
<marker start %time; #REQUIRED
        duration %time; #IMPLIED
        value CDATA #REQUIRED
        completed CDATA #IMPLIED          (0 or 1)
        note CDATA #IMPLIED/>

<chapter-marker start %time; #REQUIRED
                duration %time; #IMPLIED
                value CDATA #REQUIRED
                note CDATA #IMPLIED
                posterOffset %time; #IMPLIED/>

<rating name CDATA #IMPLIED
        start %time; #IMPLIED
        duration %time; #IMPLIED
        value (favorite | reject) #REQUIRED
        note CDATA #IMPLIED/>

<keyword start %time; #IMPLIED
         duration %time; #IMPLIED
         value CDATA #REQUIRED
         note CDATA #IMPLIED/>

<analysis-marker start %time; #IMPLIED
                 duration %time; #IMPLIED
                 type CDATA #REQUIRED/>      (e.g. "excessive shake", "person detected")
```

Markers are children of clips (asset-clip, audio, video, title, gap, etc.) — they do **not** live directly under `<spine>` or `<sequence>`. Each marker's `start` is relative to its parent clip's local timeline.

### 11.8 FCPXML bundle layout (optional, for archival/transfer)

When shipping media alongside the FCPXML, use the `.fcpxmld` bundle convention:

```
MyExchange.fcpxmld/
├── Info.plist                     (CFBundleIdentifier, CFBundleName, CFBundlePackageType=BNDL)
└── MyExchange.fcpxml              (the FCPXML document)
└── Media/                          (referenced media files)
    ├── clip1.mov
    └── clip2.mov
```

In the FCPXML, use **relative paths** in `src` attributes:

```xml
<media-rep kind="original-media" src="Media/clip1.mov"/>
```

This makes the bundle self-contained and portable across systems.

### 11.9 What the DTD does NOT validate (we must enforce via Zod)

The DTD uses `CDATA` for almost every attribute. The following constraints must be enforced by our Zod schema in code:

1. `version` must be exactly `"1.10"` (DTD declares `#FIXED "1.10"` — good).
2. `id`/`ref` cross-references must resolve (DTD declares `ID`/`IDREF` — parser checks at parse time).
3. `colorSpace` triplet format must match the regex `^\d+-\d+-\d+( \([^)]+\))?$` or be `sRGB IEC61966-2.1` / `Adobe RGB (1998)`.
4. Time values must match `^\d+(/\d+)?s$` (the DTD accepts any `CDATA`).
5. `audioRate` must be one of the 7 enumerated values.
6. `frameDuration` must be a valid rational time matching the project fps.
7. `srcEnable`, `tcFormat`, `audioLayout`, `fieldOrder`, etc. must be one of the enumerated values (DTD does enforce these via `(a | b | c)` syntax — but our Zod schema should mirror them).
8. Sequence-level color space must come from the referenced `<format>` resource — there is no `colorSpace` attribute on `<sequence>`.

---

## 12. Code References

### 12.1 Spec context (local files)

| File | LOC | Purpose |
|---|---|---|
| `/home/z/my-project/nle-core-spec/00-master-spec.md` | 466 | Master spec — stream map, decisions, WYSIWYG contract (path updated from the original /download/nle-spec/ clone location) |
| `/home/z/my-project/nle-core-spec/10-fcpxml-export.md` | 727 | Seed spec for this stream (refined by this file; path updated) |
| `/home/z/my-project/nle-core-spec/09-project-model.md` | 2379 | Dependency — `ProjectJSON`, `MediaColorInfo`, `ElementJSON`, `TransitionJSON` schema. SCOUT-09 flagged the need for sequence-level `colorSpace` (§8.13, §11 Correction #3) — addressed in this file's §10 Q8 / §13 Correction #7. (path updated) |

### 12.2 Apple documentation (markdown mirrors fetched successfully)

All URLs below were fetched during this scout task with HTTP 200 (markdown versions are published alongside the HTML versions per Apple's `link rel="alternate" type="text/markdown"`).

| URL | HTTP | Size | Purpose |
|---|---|---|---|
| https://developer.apple.com/documentation/professional-video-applications/fcpxml-reference | 200 | 17 KB | FCPXML Reference root (HTML shell; JS-driven content) |
| https://developer.apple.com/documentation/professional-video-applications/fcpxml-reference.md | 200 | 5.7 KB | Markdown mirror — topic index |
| https://developer.apple.com/documentation/professional-video-applications/asset.md | 200 | 11 KB | `<asset>` docs; **Well-Known Color Space Triplets table** (verified Q8) |
| https://developer.apple.com/documentation/professional-video-applications/format.md | 200 | 6.3 KB | `<format>` docs; color space triplet syntax |
| https://developer.apple.com/documentation/professional-video-applications/asset-clip.md | 200 | 1.6 KB | `<asset-clip>` docs |
| https://developer.apple.com/documentation/professional-video-applications/sequence.md | 200 | 0.6 KB | `<sequence>` docs (sparse — DTD is primary source) |
| https://developer.apple.com/documentation/professional-video-applications/timing-attributes.md | 200 | 2.0 KB | `offset`/`start`/`duration` semantics; rational time format |
| https://developer.apple.com/documentation/professional-video-applications/title.md | 200 | 0.9 KB | `<title>` docs (sparse — DTD is primary source) |
| https://developer.apple.com/documentation/professional-video-applications/transition.md | 200 | 1.3 KB | `<transition>` docs — confirms `filter-video`/`filter-audio` children |
| https://developer.apple.com/documentation/professional-video-applications/effect.md | 200 | 2.7 KB | `<effect>` docs; `uid` format for Motion templates |
| https://developer.apple.com/documentation/professional-video-applications/spine.md | 200 | 0.5 KB | `<spine>` docs |

### 12.3 URLs that failed (documented for posterity)

| URL | HTTP | Notes |
|---|---|---|
| https://developer.apple.com/documentation/finalcutproxreferencedocumentation | 404 | Seed spec's stale URL. Apple renamed to `professional-video-applications/fcpxml-reference`. |
| https://developer.apple.com/sample-code/av/fcpxml/FCPXML_1_10.xsd | 403 | No XSD exists publicly. Apple uses DTD, not XSD. |

### 12.4 FCPXML 1.10 DTD (authoritative schema)

| URL | HTTP | Size | Purpose |
|---|---|---|---|
| https://raw.githubusercontent.com/CommandPost/CommandPost/develop/src/extensions/cp/apple/fcpxml/dtd/FCPXMLv1_10.dtd | 200 | 40 KB / 785 LOC | **Official FCPXML 1.10 DTD** (Apple copyright 2011-2021, mirrored in CommandPost repo). Used as primary source for §11 schema reference. |
| https://github.com/CommandPost/CommandPost/tree/develop/src/extensions/cp/apple/fcpxml/dtd | 200 | 275 KB | Directory listing — confirms all DTD versions 1.0 through 1.14 are mirrored. |

### 12.5 Community references

| URL | HTTP | Size | Purpose |
|---|---|---|---|
| https://fcp.cafe/developers/fcpxml/ | 200 | 91 KB | Community knowledge base |
| https://fcp.cafe/developers/fcpxml.md | 200 | 29 KB | Markdown mirror with **three annotated real-world FCPXML 1.11 examples** (1.10/1.11 share relevant DTD structure for our use cases) |
| https://raw.githubusercontent.com/elliotttate/FCPBridge/main/docs/FCPXML_FORMAT_REFERENCE.md | 200 | 27 KB / 972 LOC | Third-party FCPXML Format Reference (SpliceKit docs). Used as cross-reference for §11 element tables. |
| https://github.com/andrewarrow/cutlass (README) | 200 | 22 KB | Go library FCPXML schema reference (1.13, but most elements overlap with 1.10). Used for `<asset>`, `<asset-clip>`, `<title>`, `<transition>`, `<text-style>` cross-check. |

### 12.6 npm registry (existing libraries research)

| URL | HTTP | Purpose |
|---|---|---|
| https://registry.npmjs.org/-/v1/search?text=fcpxml&size=25 | 200 | Found 14 packages (most are subtitle/srt converters). See §10 Q5. |
| https://registry.npmjs.org/-/v1/search?text=final-cut-pro-xml&size=25 | 200 | Found 15 packages (mostly overlapping with above + XML parsers). |
| https://registry.npmjs.org/-/v1/search?text=xsd+validator&size=25 | 200 | Found 18 packages for XSD/DTD validation (browser + Node). See §14. |

### 12.7 GitHub search

| URL | HTTP | Purpose |
|---|---|---|
| https://api.github.com/search/repositories?q=fcpxml&sort=stars | 200 | Found 197 FCPXML-related repos; top result `elliotttate/SpliceKit` (129★, Objective-C), `reuelk/pipeline` (Swift, 61★), `andrewarrow/cutlass` (Go, 56★). |

---

### 12.8 Code References — nle-engine (reference, NOT canon) — Round 7

**Engine FCPXML surface: verified zero.** `grep -ri fcpxml /home/z/my-project/nle-engine/src` returns 0 matches — no exporter module, no `engine.export.*`, no XML emission anywhere. This entire spec is SPEC-ONLY relative to the engine. The mapping below records what the engine's project model already provides the future exporter, plus the gaps.

> The private **nle-engine** repo (github.com/bearachprema/nle-engine, 37,958 LOC, 124 tests) is a clean-room FreeCut-port **in-between reference, NOT canon**. Where engine and spec conflict, **the spec wins**. Full reconciliation: `19-code-references.md`.

| Spec section | nle-engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §4 mapping (entire exporter) | (absence — 0 fcpxml matches in src/) | COULD-NOT-VERIFY (nothing to quote) | ENGINE-GAP | Engine export roadmap (MASTER P1.10) is MP4/WebM only — FCPXML is absent from its registers |
| §4.4 asset-clip start/duration | `core/types.ts:439` | `sourceStart: number;` | ALIGNED (field presence) | `SourceRef` groups sourceStart/sourceEnd/sourceDuration/sourceFps — maps to `<asset-clip>`; D1 wire-shape delta applies |
| §3.3/§11.6 retiming | `core/types.ts:593` | `speed?: number;` | ALIGNED (partial) | Constant speed + isReversed support the two-timept `<timeMap>`; no variable-speed ramp — ENGINE-GAP |
| §4.4 audio properties | `core/types.ts:605` | `volume?: number;` | ALIGNED (field presence) | dB volume + seconds-based fades map to `<adjust-volume>`/fade params |
| §4.7 markers | `core/types.ts:1067` | `markers?: ProjectMarker[];` | ALIGNED (with mapping nuance) | Timeline-level markers must be assigned to covering clips (Correction #10) |
| §4.2 format resources | `core/types.ts:1049` | `fps: number;` | ALIGNED (field presence) | `TimelineData {fps, width, height}` supplies `<format>`; no colorSpace anywhere |
| §4.2/§13 Corr #4 colorSpace | `media/metadata.ts:46` | `export interface MediaMetadata {` | ENGINE-GAP | No colorSpace field in MediaMetadata — highest-value pre-export engine addition |
| §3.1 lane mapping | `core/types.ts:760` | `export type TrackKind = 'video' \| 'audio';` | ALIGNED (mapping needed) | Exporter must synthesize lanes from track.order (V3/V2/A1 per M2) |
| §4.5 transitions | `core/types.ts:371` | `presentation: TransitionPresentation;` | ALIGNED (field presence) | Richer than spec 10's crossfade-only §4.5; only crossfade maps in v1 |
| §8.1 non-exported item types | `core/types.ts:734` | `export interface CompositionItem extends BaseClip {` | ENGINE-GAP | Comps exist as types but render zero pixels (player.ts:1038) — consistent with §8.1 |

---

## 13. Corrections to Seed Spec

Each correction below cites the DTD line or Apple doc URL that contradicts the seed assumption.

### Correction #1: `timeScale` is not a valid attribute of `<asset-clip>`

**Seed assumption (§4.4 lines 304-306):**
> `speedAttr = ` timeScale="${el.speed}" `;` — emits `timeScale="2"` on `<asset-clip>` for 2× speed.

**DTD evidence (`FCPXMLv1_10.dtd` lines 493-504):** The `<asset-clip>` attribute list contains `ref`, `%clip_attrs_with_optional_duration;` (which expands to `lane`, `offset`, `name`, `start`, `duration`, `enabled`), `srcEnable`, `audioStart`, `audioDuration`, `format`, `tcStart`, `tcFormat`, `modDate`, `audioRole`, `videoRole`. **There is no `timeScale` attribute.**

**Correct pattern:** speed changes use child elements:
- Constant speed: `<timeMap>` with two `<timept>` entries (see §11.6).
- Variable speed: `<timeMap>` with three or more `<timept>` entries with `interp`.
- Frame-rate conform: `<conform-rate srcFrameRate="25"/>`.

**Action:** Replace `speedAttr` logic in `buildAssetClip()` with `<timeMap>` child generation.

### Correction #2: `volume` is not a valid attribute of `<asset-clip>` (or any clip)

**Seed assumption (§4.4 lines 312-314):**
> `audioAttrs = ` volume="${volumeDb}dB" `;` if (el.muted) audioAttrs += `enabled="0" `;

**DTD evidence (`FCPXMLv1_10.dtd` lines 493-504):** No `volume` attribute exists on `<asset-clip>` (or `<audio>`, `<video>`, `<title>`).

**Correct pattern:**
- Volume: child element `<adjust-volume amount="<dB>dB"/>` (DTD line 341-342).
- Mute: child element `<mute start=".." duration=".."/>` (DTD lines 205-207). The `enabled="0"` attribute disables the entire clip (video and audio), not just audio.
- Audio fades: `<fadeIn>`/`<fadeOut>` child elements with `type` and `duration` (DTD lines 185-192).

**Action:** Remove `audioAttrs` from attribute string; emit `<adjust-volume>`, `<mute>`, `<fadeIn>`, `<fadeOut>` as child elements.

### Correction #3: `<adjust-opacity>` element does not exist; use `<adjust-blend>`

**Seed assumption (§4.4 lines 320-321):**
> `visualAttrs = `><adjust-opacity amount="${el.opacity}"/></asset-clip>`;

**DTD evidence (`FCPXMLv1_10.dtd` lines 274-276, 368):** The `%intrinsic-params-video;` entity (DTD line 368) enumerates all visual adjustment elements: `object-tracker`, `adjust-crop`, `adjust-corners`, `adjust-conform`, `adjust-transform`, `adjust-blend`, `adjust-stabilization`, `adjust-rollingShutter`, `adjust-360-transform`, `adjust-reorient`, `adjust-orientation`, `adjust-cinematic`. **There is no `adjust-opacity` element.** Opacity is controlled via `<adjust-blend amount="0..1" mode=".."/>`.

**Action:** Replace `<adjust-opacity>` with `<adjust-blend>`.

### Correction #4: `colorSpace` lives on `<format>`, not `<asset>`; format is a triplet, not a name

**Seed assumption (§4.2 lines 173-216):**
> Emits `<asset ... colorSpace="Rec. 709">` (per-asset human-readable color space name).

**DTD evidence (`FCPXMLv1_10.dtd` lines 60-104):**
- `<format>` has `colorSpace CDATA #IMPLIED` (line 70) with format `"<cp>-<tc>-<mc> (<name>)"` per ISO/IEC 23001-8.
- `<asset>` has `colorSpaceOverride CDATA #IMPLIED` (line 99) — "The same as the colorSpace attribute of the format element." Plus special still-image values `sRGB IEC61966-2.1` and `Adobe RGB (1998)`.
- `<asset>` does **not** have a `colorSpace` attribute.

**Correct pattern:**
- Emit `colorSpace` on the `<format>` resource (one per project).
- Emit `colorSpaceOverride` on `<asset>` only when the asset's color space differs from the format's color space.
- Format: `1-1-1 (Rec. 709)` — a triplet, not a bare name.

**Well-known triplets (DTD comment lines 70-73):**
- `1-1-1 (Rec. 709)` — BT.709 SDR
- `6-1-6 (Rec. 601 NTSC)` — NTSC SD
- `5-1-6 (Rec. 601 PAL)` — PAL SD
- `9-1-9 (Rec. 2020)` — BT.2020 SDR
- `9-16-9 (Rec. 2020 PQ)` — BT.2020 HDR PQ
- `9-18-9 (Rec. 2020 HLG)` — BT.2020 HDR HLG

**Seed spec claimed `Display P3` and `sRGB` are valid colorSpace values** — both are wrong for v1.10. `Display P3` is not documented as a well-known triplet in the 1.10 DTD (it was added in FCPXML 1.11 / FCP 10.6). `sRGB` is only valid as `colorSpaceOverride` for still images, written in full as `sRGB IEC61966-2.1`.

**Action:** Replace `formatColorAttrs(colorInfo)` (seed §4.2 lines 193-216) with the new `formatColorSpaceTriplet(displayMode)` (this file §4.2) returning a triplet string for the `<format>` element. Emit `colorSpaceOverride` on `<asset>` only when needed.

### Correction #5: `<transition>` contains `<filter-video>`/`<filter-audio>`, not `<effect>`

**Seed assumption (§4.5 lines 366-371):**
> `<transition ...><effect ref="${effectId}"/></transition>`

**DTD evidence (`FCPXMLv1_10.dtd` lines 584-588):**
```
<!ELEMENT transition (filter-video?, filter-audio?, (%marker_item;)*, metadata?, reserved?)>
<!ATTLIST transition name CDATA #IMPLIED>
<!ATTLIST transition offset %time; #IMPLIED>
<!ATTLIST transition duration %time; #REQUIRED>
```

The `<transition>` element has three attributes (`name`, `offset`, `duration`) and contains `<filter-video>`/`<filter-audio>` children (each of which has a `ref` to an `<effect>` resource).

**Correct pattern (per FCP.cafe examples and cutlass docs):**
```xml
<transition name="Cross Dissolve" offset="108108/24000s" duration="24024/24000s">
  <filter-video ref="r5" name="Cross Dissolve"/>
  <filter-audio ref="r5" name="Cross Dissolve (Audio)"/>
</transition>
```

**Also:** the seed's guessed effect IDs (`FFColorCrossDissolve`, `FFWipeLeft`, `FFSlideLeft`) are internal FxPlug identifiers, not the public FCPXML format. The `<effect>` resource's `uid` attribute is a path under FCP's Motion template directory (e.g., `.../Transitions.localized/Dissolves.localized/Cross Dissolve.effectBundle`).

**Action:** Replace `buildTransition()` to emit `<filter-video>` + `<filter-audio>` children. Declare `<effect>` resources in `<resources>` for each transition type used.

### Correction #6: FCPXML uses DTD, not XSD

**Seed assumption (§6.1 lines 526-551, §10 Q6):**
> "FCPXML 1.10 has an official XSD schema (provided by Apple)."

**Evidence:** No XSD exists. The official schema is `FCPXMLv1_10.dtd` (DTD format). The DTD file header explicitly says "FCP XML Interchange Format, Version 1.10 / Copyright (c) 2011-2021 Apple Inc." The URL `https://developer.apple.com/sample-code/av/fcpxml/FCPXML_1_10.xsd` returns HTTP 403. The seed's `libxmljs2`/`xmllint` XSD validation approach is wrong — both tools validate DTDs natively, but the seed treated them as XSD validators.

**Action:** Switch validation strategy from XSD-thinking to DTD-thinking. See §14 for the recommendation.

### Correction #7: No `sequence colorSpace` attribute exists — use the `<format>` resource

**Seed assumption (referenced from SCOUT-09 §11 Correction #3 in `09-project-model.md` lines 1872-1880):**
> "ALSO derive a sequence-level `colorSpace` from `ProjectSettings.displayMode.primaries` + `transfer` and emit `<sequence colorSpace="...">`."

**DTD evidence (`FCPXMLv1_10.dtd` lines 418-423):**
```
<!ELEMENT sequence (note?, spine, metadata?)>
<!ATTLIST sequence %media_attrs;>          (format IDREF #REQUIRED, duration, tcStart, tcFormat)
<!ATTLIST sequence audioLayout (mono | stereo | surround) #IMPLIED>
<!ATTLIST sequence audioRate %audioHz; #IMPLIED>
<!ATTLIST sequence renderFormat CDATA #IMPLIED>
<!ATTLIST sequence keywords CDATA #IMPLIED>
```

There is **no `colorSpace` attribute on `<sequence>`**. The sequence references a `<format>` resource (via `format IDREF #REQUIRED`), and the `<format>` carries the `colorSpace` attribute (§13 Correction #4). SCOUT-09's concern about sequence-level colorSpace is already covered by the format resource that the sequence references.

**Action:** No change needed to the sequence XML. Just ensure the `<format>` resource (which the sequence already references via `format="r1"`) carries the project's `colorSpace` triplet derived from `ProjectSettings.displayMode`.

### Correction #8: Apple's documentation URL has changed

**Seed assumption (§10 Q1 line 638):**
> URL: https://developer.apple.com/documentation/finalcutproxreferencedocumentation

**Evidence:** That URL returns HTTP 404. The current canonical URL is `https://developer.apple.com/documentation/professional-video-applications/fcpxml-reference` (verified HTTP 200).

**Action:** Update any references in our codebase to use the new URL.

### Correction #9: `<title>` requires an `<effect>` Motion template reference

**Seed assumption (§4.6 lines 386-392):**
> Emits `<title ...><text>...</text><text-style ref="tsr1"/></title>` with no `<effect>` resource declared.

**DTD evidence (`FCPXMLv1_10.dtd` lines 537-540):**
```
<!ELEMENT title (param*, text*, text-style-def*, note?, %intrinsic-params-video;, ...)>
<!ATTLIST title ref IDREF #REQUIRED>          <!-- 'effect' ID for a Motion template -->
```

The `<title>` element requires a `ref` to an `<effect>` resource (typically FCP's built-in "Basic Title" Motion template at UID `.../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti`). The seed spec omitted this.

**Correct pattern (per FCP.cafe example 3):**
```xml
<!-- In <resources>: -->
<effect id="r10" name="Basic Title"
        uid=".../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti"/>

<!-- In spine (or as anchored item): -->
<title ref="r10" name="Opening Title" offset="0s" duration="120120/24000s" lane="0">
  <text>
    <text-style ref="ts1">Welcome to the Show</text-style>
  </text>
  <text-style-def id="ts1">
    <text-style font="Helvetica Neue" fontSize="72" fontFace="Bold"
                fontColor="1 1 1 1" alignment="center"/>
  </text-style-def>
</title>
```

**Action:** Add a "Basic Title" effect resource declaration to `buildResources()` and reference it from every `<title>` element.

### Correction #10: `marker` element uses `start` (not `offset`); is child of clip, not standalone

**Seed assumption (§4.7 lines 411-415):**
> Emits `<marker start="${offset}" duration="..." value="..."/>` directly under `<sequence>`.

**DTD evidence (`FCPXMLv1_10.dtd` lines 655-660):**
```
<!ELEMENT marker EMPTY>
<!ATTLIST marker start %time; #REQUIRED>
<!ATTLIST marker duration %time; #IMPLIED>
<!ATTLIST marker value CDATA #REQUIRED>
<!ATTLIST marker completed CDATA #IMPLIED>
<!ATTLIST marker note CDATA #IMPLIED>
```

The `<sequence>` element only allows `(note?, spine, metadata?)` as children (DTD line 418) — markers are **not** allowed directly under `<sequence>`. Markers must be children of clips (`asset-clip`, `audio`, `video`, `title`, `gap`, `sync-clip`, `mc-clip`, `ref-clip`, `clip`).

The `start` attribute is relative to the parent clip's local timeline (not the sequence timeline).

**Action:** Move marker emission into the clip-building functions (`buildAssetClip`, `buildAudioClip`, etc.). For project-level markers (not attached to a specific clip), emit them on the closest preceding clip in the spine, or on a `<gap>` element placed at the marker's timecode.

### Correction #11: Seed's `media-rep kind="original-mediarep"` is wrong; valid kinds are `original-media` and `proxy-media`

**Seed assumption (§3.1 line 44):**
> `<media-rep kind="original-mediarep"/>`

**DTD evidence (`FCPXMLv1_10.dtd` lines 106-109):**
```
<!ATTLIST media-rep kind (original-media | proxy-media) "original-media">
```

The valid kinds are `original-media` and `proxy-media` (not `original-mediarep`).

**Action:** Use `kind="original-media"`.

---

## 14. Browser Validation Recommendation

### 14.1 The recommendation (TL;DR)

**Use a hand-written Zod schema for browser validation; optionally validate server-side with `xmllint --dtdvalid` for authoritative DTD compliance.**

### 14.2 Why Zod in the browser

The DTD uses `CDATA` for almost every attribute, which means a strict DTD validator can only check:
- Well-formed XML structure (every tag closed, attributes quoted).
- Element/attribute name presence (must be in the DTD).
- Parent-child containment (per `<!ELEMENT>` content models).
- ID/IDREF cross-reference resolution (at parse time).
- Enumerated attribute values where the DTD uses `(a | b | c)` syntax.

The DTD does **not** check:
- Time value format (`100/3000s` vs `garbage`).
- colorSpace triplet validity (`1-1-1 (Rec. 709)` vs `nonsense`).
- Cross-resource type compatibility (does the `ref="r1"` point to a `<format>` or `<asset>`?).
- Required attributes that the DTD marks `#IMPLIED` but our spec requires.

A Zod schema enforces all of these. It runs in pure TypeScript with no external dependencies, integrates with our existing `ProjectSchema` (Zod-based), and gives us actionable error messages.

### 14.3 Recommended architecture

```ts
// src/fcpxml/schema.ts

import { z } from 'zod';

// Time value: rational seconds like "1001/30000s" or "5s"
const TimeValue = z.string().regex(/^\d+(/\d+)?s$/, 'Invalid time value');

// Color space triplet: "1-1-1 (Rec. 709)" or "sRGB IEC61966-2.1"
const ColorSpaceTriplet = z.union([
  z.string().regex(/^\d+-\d+-\d+( \([^)]+\))?$/, 'Invalid color space triplet'),
  z.literal('sRGB IEC61966-2.1'),
  z.literal('Adobe RGB (1998)'),
]);

const FCPXMLEffect = z.object({
  id: z.string().regex(/^r\d+$/),
  name: z.string().optional(),
  uid: z.string(),  // Motion template path or FxPlug ID
  src: z.string().optional(),
});

const FCPXMLFormat = z.object({
  id: z.string().regex(/^r\d+$/),
  name: z.string().optional(),
  frameDuration: TimeValue.optional(),
  fieldOrder: z.enum(['progressive', 'upper first', 'lower first']).optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  colorSpace: ColorSpaceTriplet.optional(),
  projection: z.enum(['none', 'equirectangular', 'fisheye', 'back-to-back fisheye', 'cubic']).optional(),
  stereoscopic: z.enum(['mono', 'side by side', 'over under']).optional(),
});

const FCPXMLAsset = z.object({
  id: z.string().regex(/^r\d+$/),
  name: z.string().optional(),
  uid: z.string().optional(),
  start: TimeValue.optional(),
  duration: TimeValue.optional(),
  hasVideo: z.enum(['0', '1']).optional(),
  hasAudio: z.enum(['0', '1']).optional(),
  format: z.string().optional(),  // IDREF — checked at parse time
  audioSources: z.string().optional(),
  audioChannels: z.string().optional(),
  audioRate: z.string().optional(),
  colorSpaceOverride: ColorSpaceTriplet.optional(),
  mediaRep: z.object({
    kind: z.enum(['original-media', 'proxy-media']),
    src: z.string(),
    sig: z.string().optional(),
  }),
});

const FCPXMLAssetClip = z.object({
  ref: z.string(),  // IDREF
  lane: z.string().optional(),
  offset: TimeValue.optional(),
  start: TimeValue.optional(),
  duration: TimeValue.optional(),
  name: z.string().optional(),
  enabled: z.enum(['0', '1']).optional(),
  srcEnable: z.enum(['all', 'audio', 'video']).optional(),
  audioRole: z.string().optional(),
  videoRole: z.string().optional(),
  // ...children (adjust-volume, adjust-blend, adjust-transform, timeMap, markers, etc.)
});

// ... etc for all elements we emit

export const FCPXMLDocumentSchema = z.object({
  version: z.literal('1.10'),
  resources: z.object({
    formats: z.array(FCPXMLFormat),
    assets: z.array(FCPXMLAsset),
    effects: z.array(FCPXMLEffect),
  }),
  // ... library/event/project/sequence/spine tree
});

// Validate before emitting:
export function validateFCPXMLDocument(doc: FCPXMLDocument): { valid: boolean; errors: z.ZodError[] } {
  const result = FCPXMLDocumentSchema.safeParse(doc);
  return result.success
    ? { valid: true, errors: [] }
    : { valid: false, errors: [result.error] };
}
```

### 14.4 Optional server-side DTD validation (cloud render)

For authoritative DTD compliance (e.g., before delivering a render to a user), validate server-side with `xmllint`:

```bash
# On cloud render server (Node.js or shell):
xmllint --dtdvalid FCPXMLv1_10.dtd /path/to/output.fcpxml
# Exit code 0 = valid, non-zero = invalid (errors printed to stderr)
```

Or via `libxmljs2` (Node.js native binding):

```ts
import libxml from 'libxmljs2';

const dtd = libxml.parseXmlDTD(fs.readFileSync('FCPXMLv1_10.dtd', 'utf8'));
const xml = libxml.parseXml(generatedFCPXML);
const valid = xml.validate(dtd);
if (!valid) {
  for (const err of xml.validationErrors) {
    console.error(err.message);
  }
}
```

Bundle the `FCPXMLv1_10.dtd` (40 KB) as a static asset in our cloud render image.

### 14.5 npm packages evaluated

Per the npm search (§12.6):

| Package | Verdict | Reason |
|---|---|---|
| `libxmljs2` (Node native) | ✅ Use for cloud render | Authoritative libxml2 binding; supports DTD validation natively |
| `xml-xsd-validator-browser@1.0.9` | ⚠️ Consider | Pure JS, browser-compatible; supports DTD via `xs:include`/`xs:redefine`/`xs:import`. Bundle size unknown — verify at impl time. |
| `xsd-validator@1.1.1` / `@richhouse83/xsd-validator@1.0.0` | ⚠️ Consider | Pure JS, but small/old; verify maintenance status before adoption. |
| `xsd-schema-validator@0.11.0` / `@authenio/xsd-schema-validator@0.7.3` | ❌ Skip | Pure JS, but seems oriented to SOAP/SAML schemas, not arbitrary DTDs. |
| `fast-xml-parser@5.11.0` | ✅ Use | We already plan to use this for XML parsing; it doesn't validate against DTDs but gives well-formedness checks. |
| `xmllint`-WASM (e.g., `xmllint-wasm`) | ⚠️ Consider | Authoritative libxml2 via WASM, but ~1 MB bundle. Worth it only if Zod schema is insufficient. |

### 14.6 What NOT to do

- ❌ Don't ship the 40 KB DTD to the browser and parse it client-side. The Zod schema is more useful for our purposes (it catches what the DTD misses).
- ❌ Don't try to translate the DTD to XSD. There's no benefit; DTDs and XSDs express different things, and Apple's DTD is the authoritative source.
- ❌ Don't use `libxmljs2` in the browser. It requires native bindings; use Node.js or a cloud-render server instead.

---

## 15. Test Plan for This Stream

(Preserved verbatim from seed §11 — renumbered from §11 to §15.)

1. **DTD validation test:** Generate FCPXML for 10 sample projects. Validate against `FCPXMLv1_10.dtd` (server-side via `xmllint --dtdvalid` or `libxmljs2`). All must pass. Also pass Zod schema validation in browser.

2. **Round-trip test:** Generate FCPXML → parse it back (XML → object via `fast-xml-parser`) → compare to original. Assert semantic equivalence.

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

7. **Color metadata test:** Export a project with HDR (PQ) media. Verify FCP recognizes it as HDR (sequence `<format colorSpace="9-16-9 (Rec. 2020 PQ)"/>`, asset `<colorSpaceOverride="9-16-9 (Rec. 2020 PQ)"/>` if asset differs from sequence).

8. **Transition test:** Export with crossfade transitions. Verify each works in FCP. (Wipe/slide/iris/glitch: ⚠️ DEFERRED to manual verification at implementation time.)

9. **Retime test:** Export with speed = 2.0 and speed = 0.5 via `<timeMap>`. Verify FCP preserves retiming.

10. **Marker test:** Export with markers (attached to clips, not standalone). Verify they appear in FCP at the correct positions.

11. **Text element test:** Export with a text element using `<title ref="r_basic_title">` + `<text>` + `<text-style-def>`. Verify it appears as a title in FCP.

12. **Empty project test:** Export an empty project (no clips — just a `<spine>` with no children, or a `<gap>` covering the sequence duration). Verify valid FCPXML (no errors).

13. **Large project test:** Export a project with 100 clips, 10 tracks, 50 transitions. Verify FCP opens it in <5 seconds.

---

## 16. Testing

> See `17-test-plan.md` §4 for the per-module template, §3 for the test
> matrix, and §5 for canonical test-asset naming. Matrix row for this
> stream: "FCPXML export (DTD valid)", "FCPXML round-trip (FCP/DaVinci/Premiere)",
> "FCPXML with media bundle", "colorSpace triplet format", "Keyboard
> shortcut `Cmd+E` (export FCPXML)". EngineCommand types referenced in
> Tier 3 (`exportFCPXML`) are defined in `15-wire-protocol.md` §4.3
> (added in Round 7 — see note in Tier 3 below). The brief test plan in
> §15 above remains as the *intent* list; this section is the
> *executable* contract — reviewers compare it line-by-line against the
> actual test files. The manual FCP/DaVinci/Premiere round-trip tests
> are **CRITICAL** (gating) — they cannot be automated (see
> `17-test-plan.md` §12 entries M1–M4).

### Tier 1: Pure engine tests

[Filename: `tests/unit/10-fcpxml-export/*.test.ts`]

**FCPXML structure (project → XML):**

- `export-empty-project-produces-minimal-valid-fcpxml` — empty
  ProjectJSON (1 scene, 0 elements, 1 track) produces a `<fcpxml>` with
  a single `<sequence>` containing an empty `<spine>` (or a `<gap>`
  covering the sequence duration); XML is well-formed; passes DTD
  validation against `FCPXMLv1_10.dtd`; passes Zod schema
  (`FCPXMLDocumentSchema`)
- `export-simple-cut-three-clips-produces-correct-spine` — 3 clips on
  the main track produce 3 `<asset-clip>` children of `<spine>` in
  order, with `offset`, `start`, `duration`, `ref` attributes set
  correctly from `MediaTime` ticks (120K/sec) to FCPXML rational time
- `export-multi-track-overlay-main-audio-assigns-correct-lanes` —
  project with overlay + main + audio tracks produces
  `<asset-clip lane="1">` (overlay, positive lane) on the main track
  (`lane="0"` or absent), and `<asset-clip lane="-1">` (audio,
  negative lane); lane signs follow DTD convention (positive = above
  spine, negative = below)
- `export-with-crossfade-transition-produces-transition-element` — a
  crossfade between two adjacent clips produces a `<transition>` element
  between the two `<asset-clip>` elements on the spine, with
  `<filter-video>` child referencing the cross-dissolve Motion template
  (DTD §4.5); no `<effect>` child (see §13 Correction #5)
- `export-with-2x-retiming-produces-correct-timemap` — a clip with
  `retime: { speed: 2.0 }` produces an `<asset-clip>` containing a
  `<timeMap>` with two `<timept>` entries: `timept(0s, 0s)` and
  `timept(sourceDuration/2 s, sourceDuration s)` (DTD §11.6);
  `duration` attribute on the clip reflects the *retimed* duration
  (halved)
- `export-with-text-element-produces-title-with-effect-ref` — a text
  element produces `<title ref="r_basic_title">` on the spine, with
  `<text>` and `<text-style-def>` resources in `<resources>` (DTD
  §4.6); `<effect>` ref points to a built-in Motion template UID
- `export-with-markers-produces-marker-as-child-of-clip` — a clip with
  one marker produces `<marker>` as a child of the `<asset-clip>`, with
  `start` attribute (not `offset` — see §13 Correction #10) in
  rational time; markers are **not** standalone elements on the spine
- `export-colorspace-triplet-format-is-correct` — a Rec. 709 format
  produces `<format colorSpace="1-1-1 (Rec. 709)"/>` (the DTD-required
  triplet), never `<format colorSpace="Rec. 709"/>`; tested with
  `tests/fixtures/projects/10/hdr-pq.json` which produces
  `<format colorSpace="9-16-9 (Rec. 2020 PQ)"/>` (see §13 Correction #4)
- `export-colorspace-lives-on-format-not-asset` — colorSpace attribute
  appears only on `<format>` resources, never on `<asset>` elements;
  assets may have `colorSpaceOverride` only when their color space
  differs from the format they reference
- `export-per-asset-colorspaceoverride-when-asset-differs-from-format`
  — when an asset's color space differs from its parent format, the
  `<asset>` element carries `colorSpaceOverride="<triplet>"`; when
  they match, no `colorSpaceOverride` is emitted
- `export-display-p3-falls-back-to-rec709-with-warning` — a project
  tagged Display P3 produces `<format colorSpace="1-1-1 (Rec. 709)"/>`
  (v1.10 DTD has no Display P3 triplet) and emits a `console.warn()`
  with the format-IDs that were remapped; warning text is asserted via
  Vitest `vi.spyOn(console, 'warn')`
- `export-media-rep-kind-is-original-media` — every `<asset>` carries
  `<media-rep kind="original-media" src="..."/>`, never
  `kind="original-mediarep"` (see §13 Correction #11); `proxy-media`
  kind is used only when asset has a designated proxy
- `export-xml-escaping-escapes-all-five-special-chars` — clip names
  containing `&`, `<`, `>`, `"`, `'` (e.g., `"Tom & Jerry <the cat>"`)
  are escaped to `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`
  respectively in the emitted XML; the parsed-back string equals the
  original (round-trip)
- `export-time-formatting-emits-valid-rational-time` — `MediaTime`
  values emit as `<num>/<den>s` where `den` is 1 for whole seconds and
  the frame-rate denominator otherwise (e.g.,
  `MediaTime(60 * 120000)` → `60s`; `MediaTime(1001 * 120000 / 30000)`
  → `1001/30000s`); regex `/^\d+(/\d+)?s$/` matches every emitted time
- `export-time-reduction-emits-simplest-equivalent-rational` —
  `60/30s` is reduced to `2s` (GCD reduction); `1001/30000s` stays
  (already in lowest terms, NTSC); `24000/30000s` is reduced to `4/5s`
  (or `1s` if it equals a whole second — depends on the value)
- `export-zod-schema-validates-generated-fcpxml` — every generated
  FCPXML document passes `FCPXMLDocumentSchema.parse()` (see §14.3 for
  the schema definition); a hand-crafted malformed FCPXML (missing
  required attribute, bad colorSpace triplet, etc.) fails Zod
  validation with an actionable error message
- `export-round-trip-export-parse-compare-semantically-equivalent` —
  given a ProjectJSON `P`, the test calls `exportFCPXML(P)`, parses
  the resulting XML back via `fast-xml-parser`, and asserts semantic
  equivalence to `P` (same tracks in same order, same elements with
  same sourceStart/duration/startTime, same transitions, same markers);
  lossy fields (effects not in FCPXML vocabulary) are excluded from
  the comparison and listed in the test's `KNOWN_LOSSY_FIELDS` array

**Zod schema (DTD-level structure validation):**

- `zod-schema-rejects-missing-required-attribute` — `<asset>` without
  `id` fails with `issue.path = ['asset', 'id']`
- `zod-schema-rejects-bad-colorspace-triplet` —
  `colorSpace: "Rec. 709"` (not a triplet) fails with regex mismatch
- `zod-schema-rejects-bad-media-rep-kind` —
  `kind: "original-mediarep"` fails enum check (only `original-media`
  and `proxy-media` allowed)
- `zod-schema-rejects-bad-time-value` — `start: "1001/30000"`
  (missing trailing `s`) fails time regex
- `zod-schema-rejects-unknown-element-name` — `<asset-clipx>` (typo)
  fails the closed element-name enum (the schema mirrors the DTD's
  `<!ELEMENT>` inventory from §11)

**DTD validation (server-side, runs in CI even though spec is browser-first):**

- `dtd-validation-all-tier1-fixtures-pass` — for every fixture in
  `tests/fixtures/projects/10/*.json`, the exported FCPXML passes
  `xmllint --dtdvalid FCPXMLv1_10.dtd --noout <file>` with exit code
  0; this is the authoritative check that Zod alone can't fully cover
  (see §14.2 — DTD checks parent-child containment that Zod doesn't
  enforce by default)

### Tier 2: Render tests

[Filename: `tests/integration/10-fcpxml-export/*.render.test.ts`]

Tier 2 for FCPXML is "render" only in the loose sense — the exporter
doesn't produce pixels, it produces a file. Tests verify the file is
written to disk correctly and that bundled media is co-located.

- `export-fcpxml-via-ui-triggers-download-event` — clicking the
  "Export FCPXML" affordance in the spec 18 shell's Deliver page (the
  mock's menu bar is removed — spec 18 §8.1) or pressing `Cmd+E` (see
  Tier 3) triggers
  a browser download; Playwright intercepts the
  `page.on('download')` event; the downloaded file has extension
  `.fcpxml` and a non-empty body that passes Tier 1's Zod schema
  check
- `export-with-media-bundling-copies-media-alongside-fcpxml` — when
  `bundleMedia: true` is passed to the export call, the download
  directory (simulated via OPFS or Playwright's `download.path()`)
  contains both `project.fcpxml` and `media/<asset-id>.<ext>` for every
  referenced asset; the FCPXML's `<media-rep src="..."/>` values
  point to the bundled paths
- `export-relative-paths-in-fcpxml-resolve-correctly` — when media is
  bundled, the FCPXML's `<media-rep src="media/abc123.mp4"/>` is a
  relative path; opening the FCPXML from its parent directory resolves
  the media correctly (verified by parsing the FCPXML, resolving the
  path relative to the FCPXML's location, and asserting the file
  exists at the resolved location in the test sandbox)

### Tier 3: UI tests

[Filename: `tests/integration/10-fcpxml-export/*.ui.test.ts`]

> **Note on `exportFCPXML` EngineCommand (Round-7 update):** the Tier 3 tests below
> reference `engine.command.apply({ type: 'exportFCPXML', params: { ... } })`.
> The export commands were added to spec 15's `EngineCommand` union in
> Round 7 (spec 15 §4.1 union + §4.2 mapping + §4.3.74 type definition —
> the Export category). The command is a dispatch wrapper: its
> implementation remains the function-based export path
> (`engine.export.exportFCPXML(project, opts)` — ExportManager, spec 01
> §14.11). T3.2 below is **un-gated and runs as written**. The FACET-10
> follow-up is closed.

- `keyboard-cmd-e-triggers-fcpxml-export` — `Cmd+E` (macOS) /
  `Ctrl+E` (Windows/Linux) issues the export via `page.keyboard.press()`
  with focus in the timeline; Playwright intercepts the resulting
  `download` event; the downloaded file's MIME type is
  `application/x-fcpxml` (or `.fcpxml` extension) and passes the Tier 1
  Zod schema check
- `keyboard-cmd-e-matches-direct-engine-command` — **state WYSIWYG
  (see `17-test-plan.md` §6.1):** the FCPXML produced by `Cmd+E`
  equals (byte-for-byte, modulo the file's UUID/timestamp fields)
  the FCPXML produced by calling
  `engine.command.apply({ type: 'exportFCPXML', params: { bundleMedia: false } })`
  directly; this is the WYSIWYG invariant for export — keyboard path
  and direct-API path produce identical output. The `exportFCPXML`
  command dispatches to the function-based implementation
  `engine.export.exportFCPXML(project, opts)` (spec 15 §4.2 mapping;
  spec 01 §14.11 ExportManager) — both paths must produce identical
  bytes.

### Manual tests (CRITICAL — cannot be automated)

These tests are gating for every release that touches the FCPXML
exporter. They map 1:1 to entries M1–M4 in `17-test-plan.md` §12. They
cannot be automated because FCP, DaVinci Resolve, and Premiere Pro are
licensed desktop applications with no headless mode and no
scriptable import-verify API (see §12.3 of spec 17 for the full
justification).

**Manual test M1: open exported FCPXML in Final Cut Pro** (FCP 11+,
macOS, before each release, owner: QA)

Pass criteria — open `tests/fixtures/projects/10/hdr-pq.json` exported
via `engine.export.exportFCPXML(project, { bundleMedia: true })` (the implementation path the `exportFCPXML` EngineCommand dispatches to — spec 15 §4.2) in
FCP and verify:

- Project loads without errors (no red banner, no import dialog
  warning about unsupported elements)
- Clips appear in correct order on the timeline with correct in/out
  points (compare frame 0 of each clip to the source media's frame
  at `sourceStart`)
- Transitions (crossfade) appear between clips and play correctly
  (no frame jumps, no audio dropouts at the transition boundary)
- Audio levels match the source (no clipping, no -inf, perceived
  loudness within ±1 LUFS of the source mix)
- Markers appear at the correct positions (verify each marker's
  position matches its `MediaTime` in the source project)
- Multi-track structure preserved (overlay on lane 1, main on lane 0,
  audio on lane -1; lane signs match DTD convention)
- Color metadata recognized: Rec. 709 sequence shows as Rec. 709 in
  FCP's viewer; Rec. 2020 PQ sequence shows as HDR PQ (viewer
  switches to HDR mode if display supports it); colorSpaceOverride
  on a per-asset basis is honored when asset differs from sequence
  format
- Display P3 fallback: sequence that was Display P3 in source shows
  as Rec. 709 in FCP (the documented v1.10 DTD limitation — see §8.1)

**Manual test M2: open exported FCPXML in DaVinci Resolve** (DaVinci
Resolve 19+, macOS/Windows/Linux, before each release, owner: QA)

Same verifications as M1, plus:

- Resolve's color management page shows the correct color space
  (Rec. 709, Rec. 2020 PQ) — FCPXML colorSpace flows through to
  Resolve's timeline color space setting
- Resolve's timeline tracks match the FCPXML lanes (V3 = overlay,
  V2 = main video, A1 = main audio — Resolve's V/A numbering is
  1-indexed from the bottom)

**Manual test M3: open exported FCPXML in Premiere Pro** (Premiere
Pro 2024+, macOS/Windows, before each release, owner: QA)

Same verifications as M1, plus:

- Premiere maps FCPXML spine to its main sequence; lanes map to
  Premiere's V/A tracks (V3 = overlay, V2 = main, A1 = main audio)
- Lumetri color settings reflect the FCPXML colorSpace (Rec. 709,
  Rec. 2020 PQ)

**Manual test M4: FCPXML round-trip (export → FCP import → FCP
re-export → compare)** (FCP 11+, before each release, owner: QA)

Procedure:

1. Export `tests/fixtures/projects/10/simple-cut.json` to FCPXML via
   `engine.export.exportFCPXML`
2. Open in FCP, do not modify, immediately File → Export → XML
3. Parse both FCPXML files via `fast-xml-parser`
4. Compare semantically (tracks, elements, durations, transitions)
5. Pass criteria: timeline structure is identical; lossy fields are
   documented in `tests/manual/m4-lossy-fields.md` and reviewed by
   QA each release (e.g., FCP may strip our `<media-rep sig="..."/>`
   signature attribute — known lossy, acceptable)

If any of M1–M4 fail, the release is blocked (per `17-test-plan.md`
§12.2 — M1–M4 are release-blocking manual tests).

### Property-based tests

[Filename: `tests/unit/10-fcpxml-export/*.property.test.ts`]

- `any-valid-projectjson-produces-dtd-valid-fcpxml` — `fc.assert(
  fc.property(ArbitraryProjectJSON, (p) => {
    const xml = exportFCPXML(p);
    expect(FCPXMLDocumentSchema.safeParse(parseXml(xml)).success).toBe(true);
    // Server-side DTD validation runs in CI (not in fast-check loop):
    // expect(validateAgainstDTD(xml, 'FCPXMLv1_10.dtd')).toBe(true);
  }), { numRuns: 1000 })`; the arbitrary is the same
  `ArbitraryProjectJSON` used by spec 09's property tests (with
  constraints: 1–10 tracks, 0–50 elements, 0–5 transitions, all six
  element kinds represented)
- `any-mediatime-emits-valid-fcpxml-rational-time` — `fc.assert(
  fc.property(fc.record({ num: fc.integer({ min: 0, max: 1_000_000 }),
  den: fc.integer({ min: 1, max: 1001 }) }), ({ num, den }) => {
    const t = MediaTime.fromRational(num, den);
    const s = formatTimeValue(t);
    expect(s).toMatch(/^\d+(/\d+)?s$/);
    expect(parseTimeValue(s)).toEqual(t);  // round-trips
  }), { numRuns: 5000 })`
- `any-string-with-special-chars-escapes-correctly` — `fc.assert(
  fc.property(fc.stringMatching(/[&<>"']/), (s) => {
    const escaped = escapeXml(s);
    const parsed = parseXmlFragment(`<a>${escaped}</a>`).a;
    expect(parsed).toEqual(s);  // round-trips
    // No unescaped special chars in the output:
    expect(escaped).not.toMatch(/(?<!&)([<>"'])/);
    expect(escaped).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  }), { numRuns: 5000 })`

### Test assets

All test-project fixtures live under `tests/fixtures/projects/10/`. They
are minimal valid ProjectJSON files (validate against
`ProjectSchema` from spec 09). Media files referenced by these
fixtures reuse the canonical assets from `17-test-plan.md` §5.1
(`10s-red-1080p.mp4`, `10s-white-1080p-hdr-pq.mp4`, etc.) — no
fixture-specific media is generated.

- `tests/fixtures/projects/10/empty.json` — 1 scene, 0 elements, 1
  video track. Used by `export-empty-project-*` and property tests'
  edge-case sampling.
- `tests/fixtures/projects/10/simple-cut.json` — 3 clips on the main
  track, no transitions, no markers. Used by
  `export-simple-cut-three-clips-*` and manual test M4.
- `tests/fixtures/projects/10/multi-track.json` — 3 tracks
  (overlay + main + audio), 2 clips each, no transitions. Used by
  `export-multi-track-*`.
- `tests/fixtures/projects/10/with-transitions.json` — 2 clips with a
  crossfade between them. Used by
  `export-with-crossfade-transition-*`.
- `tests/fixtures/projects/10/with-retiming.json` — 1 clip with
  `retime: { speed: 2.0 }`. Used by `export-with-2x-retiming-*`.
- `tests/fixtures/projects/10/with-text.json` — 1 text element. Used
  by `export-with-text-element-*`.
- `tests/fixtures/projects/10/with-markers.json` — 1 clip with 3
  markers (start, mid, end). Used by `export-with-markers-*`.
- `tests/fixtures/projects/10/hdr-pq.json` — 1 clip with
  `colorSpace: 'Rec. 2020 PQ'` (HDR PQ) on a `<format>` resource;
  one asset has a `colorSpaceOverride` of `Rec. 709` (mixed-format
  sequence). Used by `export-colorspace-*`,
  `export-per-asset-colorspaceoverride-*`, and manual tests M1–M3
  (HDR verification).
- `tests/fixtures/dtd/FCPXMLv1_10.dtd` — the authoritative Apple DTD
  (785 lines), mirrored from the CommandPost GitHub repo (see §6.1
  for the URL). Used by Tier 1 `dtd-validation-*` tests (server-side
  via `xmllint --dtdvalid`) and CI's pre-release gate. **Not
  browser-bundled** — DTD validation in the browser uses the Zod
  schema (§14.3); the DTD is authoritative only for CI.
- `tests/fixtures/videos/10s-red-1080p.mp4` — solid red, 10s, 1080p,
  H.264, `yuv420p` (canonical from `17-test-plan.md` §5.1). Referenced
  by `simple-cut.json` and `with-markers.json`.
- `tests/fixtures/videos/10s-white-1080p-hdr-pq.mp4` — HDR PQ
  canonical clip (§5.1). Referenced by `hdr-pq.json`.

### Test commands

```bash
# Run Tier 1 tests for spec 10 (FCPXML structure, Zod schema, DTD
# validation in CI — runs on every PR that touches the exporter)
npm test -- --filter "10-fcpxml-export"

# Run Tier 2 (render / file-output) tests for spec 10
npm run test:render -- --filter "10-fcpxml-export"

# Run Tier 3 (UI keyboard) tests for spec 10
npm run test:ui -- --filter "10-fcpxml-export"

# Run all tiers for spec 10
npm run test:all -- --filter "10-fcpxml-export"

# Run property tests only (DTD-validity, time formatting, XML escaping)
npm run test:property -- --filter "10-fcpxml-export"

# Run ONLY the DTD-validation subset of Tier 1 (requires xmllint on
# the runner — installed via apt/brew in CI; skip locally if missing)
npm test -- --filter "10-fcpxml-export/dtd-validation"

# Regenerate the test-project fixtures from a template (run after
# changing ProjectJSON schema — see spec 09 §10 migration framework).
# Re-validates every fixture against ProjectSchema before overwriting.
npm run test:fixtures:regen -- --filter "10-fcpxml-export"

# Manual tests M1–M4 are run by QA before each release (not via npm).
# See tests/manual/m1-fcp-open.md, m2-davinci-open.md,
# m3-premiere-open.md, m4-fcp-round-trip.md for procedures.
```

---

**End of `10-fcpxml-export.md`.** Next: `11-cloud-render.md`.

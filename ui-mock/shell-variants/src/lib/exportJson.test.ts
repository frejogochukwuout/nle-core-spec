/* exportJson — R25-W5 item 2 (DESIGN-R25 §1 R19 / §3 W5; thread th_mtzp4xeb
 * "add a custom JSON format too"). The Custom JSON export preset's PURE half
 * pinned here; the DOM wrapper (downloadJson) is pinned with STUBBED seams
 * (jsdom has no URL.createObjectURL — the guard itself is a pin). Pins:
 * - the structure: schema literal + project metadata (from the mock's
 *   project const) + the timeline (id/name/duration/range/markers/tracks);
 * - the DETERMINISTIC KEY ORDER: every entity's keys are the documented
 *   construction order — two calls serialize identically (the interchange
 *   schema is stable, not key-order-roulette);
 * - the ElementJSON field set: required fields always, optional fields only
 *   when present (el-2 carries the full grammar — transitionOut, linkedTo,
 *   clip markers; el-5 proves absent fields stay absent);
 * - view state never exports: the track's `waveform` pref is OUT;
 * - scene selection: the requested scene + the page's fallback resolver;
 * - exportJsonFileName: live project + scene names, .json ext;
 * - downloadJson: the blob (application/json, pretty-printed) + the anchor
 *   (download name + one click) + revoke — against stubbed URL/anchor;
 *   and the jsdom guard (absent createObjectURL → silent no-op). */

import { describe, expect, it, vi } from 'vitest';
import { buildExportJson, downloadJson, exportJsonFileName, type ExportJsonDoc, type ExportJsonState } from './exportJson';
import { project } from './mockData';

/** The store-shaped state (the live scenes + loop — what useUi owns). The
 *  mock's own project.scenes is the fixture; the loop mirrors the boot
 *  {2, 28}. */
const state = (): ExportJsonState => ({ scenes: project.scenes, loop: { start: 2, end: 28 } });

const findEl = (doc: ExportJsonDoc, id: string) =>
  doc.timeline.tracks.flatMap((t) => t.elements).find((e) => e.id === id)!;

describe('exportJson — buildExportJson (the pure interchange doc, th_mtzp4xeb)', () => {
  it('the structure: schema + project metadata + the timeline (id/name/duration/range/markers)', () => {
    const doc = buildExportJson(state(), 'sc-1');
    expect(doc.schema).toBe('nle-interchange/1');
    // project metadata — the mock project const is the source of truth
    expect(doc.project).toEqual({
      name: 'Beach Doc — Rough Cut',
      status: 'Edited',
      fps: 24,
      width: 1920,
      height: 1080,
      sampleRate: 48000,
      channels: 2,
    });
    expect(doc.timeline.id).toBe('sc-1');
    expect(doc.timeline.name).toBe('Rough Cut v3');
    expect(doc.timeline.duration).toBe(30); // sceneDuration: the last tail is el-4@24+6
    expect(doc.timeline.range).toEqual({ start: 2, end: 28 }); // the live loop rides the doc
    // the scene's 5 timeline markers ride it too (mk-5 is the RANGE marker)
    expect(doc.timeline.markers).toHaveLength(5);
    expect(doc.timeline.markers.find((m) => m.id === 'mk-5')).toMatchObject({ duration: 7, notes: 'Colour pass pending on the launch shot.' });
  });

  it('tracks: the scene\'s five lanes, their flags — and the view-pref `waveform` NEVER exports', () => {
    const doc = buildExportJson(state(), 'sc-1');
    expect(doc.timeline.tracks.map((t) => t.id)).toEqual(['tr-overlay-1', 'tr-main', 'tr-audio-1', 'tr-audio-2', 'tr-caption']);
    expect(doc.timeline.tracks.find((t) => t.id === 'tr-audio-2')).toMatchObject({ kind: 'audio', name: 'A2', badge: 'A2', locked: true });
    // the caption track's language is CONTENT (rides); waveform is a view pref (never rides)
    expect(doc.timeline.tracks.find((t) => t.id === 'tr-caption')!.language).toBe('en');
    expect(Object.keys(doc.timeline.tracks[0])).not.toContain('waveform');
    // element counts ride the lanes
    expect(doc.timeline.tracks.map((t) => t.elements.length)).toEqual([1, 4, 1, 1, 5]);
  });

  it('DETERMINISTIC KEY ORDER: every entity\'s keys are the documented construction order (the schema is stable)', () => {
    const doc = buildExportJson(state(), 'sc-1');
    expect(Object.keys(doc)).toEqual(['schema', 'project', 'timeline']);
    expect(Object.keys(doc.project)).toEqual(['name', 'status', 'fps', 'width', 'height', 'sampleRate', 'channels']);
    expect(Object.keys(doc.timeline)).toEqual(['id', 'name', 'duration', 'range', 'markers', 'tracks']);
    expect(Object.keys(doc.timeline.tracks[0])).toEqual(['id', 'kind', 'name', 'badge', 'muted', 'solo', 'locked', 'visible', 'elements']);
    // the caption track gains `language` — appended AFTER the required block
    expect(Object.keys(doc.timeline.tracks[4])).toEqual(['id', 'kind', 'name', 'badge', 'muted', 'solo', 'locked', 'visible', 'language', 'elements']);
    // the element grammar: required core first, then the documented optional order
    expect(Object.keys(findEl(doc, 'el-1'))).toEqual([
      'id', 'type', 'trackId', 'name', 'startTime', 'duration',
      'sourceStart', 'sourceDuration', 'mediaId', 'speed', 'opacity',
      'fadeIn', 'fadeOut', 'effects',
    ]);
    expect(Object.keys(findEl(doc, 'el-6'))).toEqual([
      'id', 'type', 'trackId', 'name', 'startTime', 'duration',
      'sourceStart', 'mediaId', 'volume', 'pan', 'pitchSemitones', 'pitchCents', 'eq',
      'audioFadeIn', 'audioFadeOut',
    ]);
    // two calls serialize IDENTICALLY (key order + values)
    expect(JSON.stringify(buildExportJson(state(), 'sc-1'))).toBe(JSON.stringify(doc));
  });

  it('the element grammar: el-2 carries the full optional set (transitionOut + linkedTo + clip markers); absent fields stay ABSENT', () => {
    const doc = buildExportJson(state(), 'sc-1');
    const el2 = findEl(doc, 'el-2');
    expect(el2).toMatchObject({
      id: 'el-2', type: 'video', trackId: 'tr-main', name: 'Marina interview',
      startTime: 8.5, duration: 8.5, sourceStart: 3, sourceDuration: 8.5, mediaId: 'm-02',
      fadeIn: 0.75, fadeOut: 0.5,
      transitionOut: { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.75, alignment: 0.5 },
      linkedTo: 'el-7',
      markers: [
        { id: 'cm-1', offset: 2, label: 'Look up', color: 'green' },
        { id: 'cm-2', offset: 5.5, label: 'Laugh', color: 'purple' },
      ],
    });
    // the text element (el-5) has NO media/fade/markers — those keys stay out
    const el5 = findEl(doc, 'el-5');
    expect(el5.id).toBe('el-5');
    expect(el5.mediaId).toBeUndefined();
    expect(Object.keys(el5)).toEqual(['id', 'type', 'trackId', 'name', 'startTime', 'duration', 'opacity']);
    // the audio element's eq is the 4-band tuple from the fixture
    expect(findEl(doc, 'el-6').eq).toEqual([2, -1, 0, -2]);
    // effects ride when present (el-1's Gaussian Blur)
    expect(findEl(doc, 'el-1').effects).toEqual([{ id: 'fx-1', name: 'Gaussian Blur', enabled: false }]);
  });

  it('scene selection: the requested scene — an unknown id falls back to the FIRST (the page resolver)', () => {
    expect(buildExportJson(state(), 'sc-2').timeline).toMatchObject({ id: 'sc-2', name: 'Interview selects', duration: 19.5 });
    expect(buildExportJson(state(), 'sc-nope').timeline.id).toBe('sc-1');
  });

  it('exportJsonFileName: live project + scene names (never a hardcoded stem) + the .json ext', () => {
    expect(exportJsonFileName('Beach Doc — Rough Cut', 'Rough Cut v3')).toBe('Beach Doc — Rough Cut — Rough Cut v3.json');
  });
});

describe('exportJson — downloadJson (the DOM wrapper — stubbed seams)', () => {
  /** install the URL/anchor seams (createObjectURL may or may not exist in
   *  the host — the stub REPLACES it either way; Object.defineProperty, not
   *  vi.spyOn, because the property can be absent); returns the uninstall
   *  + the recorded calls, restoring the ORIGINAL descriptor. */
  const stubDownloadSeams = () => {
    const created: Blob[] = [];
    const revoked: string[] = [];
    const original = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (b: Blob) => { created.push(b); return 'blob:test-url'; },
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: (u: string) => { revoked.push(u); },
    });
    /* swallow the real click — jsdom would try to navigate to the blob URL
     *  ("Not implemented: navigation"); the spy still records `this` (the
     *  anchor) + the call count for the contract assertions below */
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function noop() { /* no-op */ });
    const uninstall = () => {
      click.mockRestore();
      if (original) Object.defineProperty(URL, 'createObjectURL', original);
      else delete (URL as unknown as Record<string, unknown>).createObjectURL;
      if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke);
      else delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    };
    return { created, revoked, click, uninstall };
  };

  it('one blob (application/json, pretty-printed) + one anchor click with the download name + revoke', async () => {
    const doc = buildExportJson(state(), 'sc-1');
    const seams = stubDownloadSeams();
    try {
      downloadJson(doc, 'Beach Doc — Rough Cut — Rough Cut v3.json');
      expect(seams.created).toHaveLength(1);
      expect(seams.created[0]!.type).toBe('application/json');
      // the blob carries the doc, pretty-printed (2-space — the summary's "Pretty-printed: on" is honest)
      const text = await seams.created[0]!.text();
      expect(text).toBe(JSON.stringify(doc, null, 2));
      expect(text).toContain('\n  "schema"'); // indented, not one line
      // the anchor: ONE click, its download attr = the file name, gone after
      expect(seams.click).toHaveBeenCalledTimes(1);
      expect((seams.click.mock.instances[0] as HTMLAnchorElement).download).toBe('Beach Doc — Rough Cut — Rough Cut v3.json');
      expect(document.querySelector('a[download]')).toBeNull(); // removed from the DOM
      expect(seams.revoked).toEqual(['blob:test-url']); // the object URL is freed
    } finally {
      seams.uninstall();
    }
  });

  it('the guard: with createObjectURL ABSENT/absent-typed the wrapper is a silent no-op (no throw, no click)', () => {
    /* simulate the host that lacks the API (raw jsdom): the descriptor is
     *  blanked, then restored — the guard must no-op instead of throwing */
    const original = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: undefined });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    try {
      expect(typeof URL.createObjectURL).toBe('undefined');
      expect(() => downloadJson(buildExportJson(state(), 'sc-1'), 'x.json')).not.toThrow();
      expect(click).not.toHaveBeenCalled();
    } finally {
      click.mockRestore();
      if (original) Object.defineProperty(URL, 'createObjectURL', original);
      else delete (URL as unknown as Record<string, unknown>).createObjectURL;
    }
  });
});

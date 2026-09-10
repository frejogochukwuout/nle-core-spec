/* mockData.ts — spec 09 §3.1-shaped sample project. These are contract
   invariants the whole mock relies on: unique ids, frame-clean times,
   spec 18 §4.10 sample layout (30 s demo), findElement/elementAtTime
   lookup semantics used by the viewer + inspector. */

import { describe, expect, it } from 'vitest';
import {
  EFFECT_DEFS, TRANSITION_PRESENTATIONS, elementAtTime, findElement, mediaById, project, sceneDuration,
  effectiveFade, fieldOfFade, type ElementJSON,
} from './mockData';
import { snapToFrame } from './timecode';

const scene1 = project.scenes.find((s) => s.id === 'sc-1')!;
const scene2 = project.scenes.find((s) => s.id === 'sc-2')!;

describe('project invariants', () => {
  it('has exactly the two sample scenes in order', () => {
    expect(project.scenes.map((s) => s.id)).toEqual(['sc-1', 'sc-2']);
  });

  it('settings match the sample project (24 fps, 1080p, 48 kHz stereo)', () => {
    expect(project.settings).toEqual({ fps: 24, width: 1920, height: 1080, sampleRate: 48000, channels: 2 });
  });

  it('scene 1 is dirty, scene 2 is clean (save-machine fixture)', () => {
    expect(scene1.dirty).toBe(true);
    expect(scene2.dirty).toBe(false);
  });
});

describe('id uniqueness', () => {
  it('scene, track, element, marker and media ids are all unique', () => {
    const ids: string[] = [];
    for (const sc of project.scenes) {
      ids.push(sc.id);
      for (const t of sc.tracks) {
        ids.push(t.id);
        for (const e of t.elements) ids.push(e.id);
      }
      for (const m of sc.markers) ids.push(m.id);
    }
    for (const m of project.media) ids.push(m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('frame-clean discipline (24 fps)', () => {
  it('every element startTime/duration sits on the frame grid', () => {
    for (const sc of project.scenes) for (const t of sc.tracks) for (const e of t.elements) {
      expect(snapToFrame(e.startTime)).toBe(e.startTime);
      expect(snapToFrame(e.duration)).toBe(e.duration);
    }
  });

  it('markers sit on the frame grid', () => {
    for (const sc of project.scenes) for (const m of sc.markers) {
      expect(snapToFrame(m.time)).toBe(m.time);
    }
  });
});

describe('spec 18 §4.10 sample shape — scene 1 "Rough Cut v3"', () => {
  it('has 5 tracks: overlay, main, audio, audio (locked A2), caption (R19)', () => {
    expect(scene1.tracks.map((t) => t.kind)).toEqual(['overlay', 'main', 'audio', 'audio', 'caption']);
    expect(scene1.tracks.find((t) => t.id === 'tr-audio-2')!.locked).toBe(true);
  });

  it('R19: the caption track carries 5 text elements with frame-clean timings + bodies', () => {
    const cc = scene1.tracks.find((t) => t.kind === 'caption')!;
    expect(cc.badge).toBe('CC');
    expect(cc.language).toBe('en');
    expect(cc.elements).toHaveLength(5);
    expect(cc.elements.map((e) => e.text)).toEqual([
      'We always visit this beach',
      'Nous venons tout le temps à la plage.',
      'Every year we spend a week here',
      'Swimming, surfing, enjoying the sunsets',
      'But this year was different',
    ]);
    // frame-clean @24: t*24 is an integer for every caption edge
    for (const e of cc.elements) {
      expect(e.startTime * 24).toBeCloseTo(Math.round(e.startTime * 24), 6);
      expect((e.startTime + e.duration) * 24).toBeCloseTo(Math.round((e.startTime + e.duration) * 24), 6);
    }
  });

  it('R19: el-2/el-3 ship clip markers; el-6 ships per-clip audio params', () => {
    const el2 = findElement(project.scenes, 'el-2')!.element;
    expect(el2.markers).toHaveLength(2);
    expect(el2.markers!.map((m) => m.id)).toEqual(['cm-1', 'cm-2']);
    const el6 = findElement(project.scenes, 'el-6')!.element;
    expect(el6.pan).toBe(-0.15);
    expect(el6.eq).toEqual([2, -1, 0, -2]);
  });

  it('main track holds the 4 sample video clips end-to-end', () => {
    const main = scene1.tracks.find((t) => t.kind === 'main')!;
    expect(main.elements.map((e) => e.id)).toEqual(['el-1', 'el-2', 'el-3', 'el-4']);
    expect(main.elements.map((e) => e.startTime)).toEqual([0, 8.5, 17.0, 24.0]);
  });

  it('el-2 ↔ el-7 form the A/V link pair (spec 05 §12.3)', () => {
    const el2 = findElement(project.scenes, 'el-2')!.element;
    const el7 = findElement(project.scenes, 'el-7')!.element;
    expect(el2.linkedTo).toBe('el-7');
    expect(el7.linkedTo).toBe('el-2');
  });

  it('el-2 carries the sample crossfade (0.75 s cut-centered)', () => {
    const el2 = findElement(project.scenes, 'el-2')!.element;
    expect(el2.transitionOut).toEqual({ type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.75, alignment: 0.5 });
  });

  it('el-1 ships a disabled Gaussian Blur (inspector toggle fixture)', () => {
    const el1 = findElement(project.scenes, 'el-1')!.element;
    expect(el1.effects).toEqual([{ id: 'fx-1', name: 'Gaussian Blur', enabled: false }]);
  });

  it('scene 1 runs 30 s (el-6 ocean ambience spans it)', () => {
    expect(sceneDuration(scene1)).toBe(30);
    expect(findElement(project.scenes, 'el-6')!.element.duration).toBe(30);
  });

  it('scene 1 has the 5 sample markers at 0 / 8.5 / 15.5 / 24 + the 17-24 range (R19)', () => {
    expect(scene1.markers.map((m) => m.time)).toEqual([0, 8.5, 15.5, 24.0, 17.0]);
    const range = scene1.markers.find((m) => m.id === 'mk-5')!;
    expect(range.duration).toBe(7.0);
    expect(range.notes).toContain('Colour pass');
    expect(scene1.markers.find((m) => m.id === 'mk-3')!.keyword).toBe('music');
  });
});

describe('media pool fixtures', () => {
  it('exposes 8 media records with unique ids', () => {
    expect(project.media).toHaveLength(8);
    expect(new Set(project.media.map((m) => m.id)).size).toBe(8);
  });

  it('m-04 waves_closeup is the offline-asset fixture (spec 18 §4.2)', () => {
    const m04 = mediaById('m-04')!;
    expect(m04.offline).toBe(true);
  });

  it('m-08 title_card is the only image (duration null)', () => {
    const m08 = mediaById('m-08')!;
    expect(m08.type).toBe('image');
    expect(m08.duration).toBeNull();
    expect(project.media.filter((m) => m.type === 'image')).toHaveLength(1);
  });

  it('mediaById returns undefined for unknown ids', () => {
    expect(mediaById('nope')).toBeUndefined();
    expect(mediaById(undefined)).toBeUndefined();
  });
});

describe('findElement', () => {
  it('locates an element with its scene + track', () => {
    const hit = findElement(project.scenes, 'el-2')!;
    expect(hit.element.id).toBe('el-2');
    expect(hit.track.id).toBe('tr-main');
    expect(hit.scene.id).toBe('sc-1');
  });

  it('returns null for unknown ids', () => {
    expect(findElement(project.scenes, 'nope')).toBeNull();
  });
});

describe('elementAtTime — viewer source resolution', () => {
  it('overlay wins over main at overlapping times', () => {
    // el-5 (overlay text) spans 8.75–12.0; el-2 (main) spans 8.5–17.0
    const hit = elementAtTime(scene1, 10)!;
    expect(hit.id).toBe('el-5');
  });

  it('resolves main-track clips when no overlay covers the time', () => {
    expect(elementAtTime(scene1, 2)!.id).toBe('el-1');
    expect(elementAtTime(scene1, 20)!.id).toBe('el-3');
    expect(elementAtTime(scene1, 28)!.id).toBe('el-4');
  });

  it('is half-open: clip end time belongs to the next clip, not the previous', () => {
    expect(elementAtTime(scene1, 8.5)!.id).toBe('el-2');
    expect(elementAtTime(scene1, 17.0)!.id).toBe('el-3');
  });

  it('returns null past the end and at gaps', () => {
    expect(elementAtTime(scene1, 31)).toBeNull();
    // scene 2 has a 0.25s gap between 6.25 and 6.5
    expect(elementAtTime(scene2, 6.4)).toBeNull();
  });
});

describe('enum tables', () => {
  it('TRANSITION_PRESENTATIONS has 27 unique entries incl. the canon Cross Dissolve', () => {
    expect(TRANSITION_PRESENTATIONS).toHaveLength(27);
    expect(new Set(TRANSITION_PRESENTATIONS).size).toBe(27);
    expect(TRANSITION_PRESENTATIONS).toContain('Cross Dissolve');
  });

  it('EFFECT_DEFS define params with min < max and a positive step', () => {
    expect(EFFECT_DEFS.length).toBeGreaterThan(3);
    for (const def of EFFECT_DEFS) {
      for (const p of def.params) {
        expect(p.min).toBeLessThan(p.max);
        expect(p.step).toBeGreaterThan(0);
        expect(p.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('sceneDuration', () => {
  it('scene 2 duration = 19.5 (last clip ends 14.5+5)', () => {
    expect(sceneDuration(scene2)).toBe(19.5);
  });
});

/* ---------- R14: multi-track viewer resolution ---------- */

describe('R14: elementAtTime scans ALL tracks of a kind (topmost wins)', () => {
  it('a clip on a second main track is visible to the viewer', () => {
    const twoMain = {
      ...scene1,
      tracks: [
        ...scene1.tracks,
        {
          id: 'tr-main-2', kind: 'main' as const, name: 'V2', badge: 'V2',
          muted: false, solo: false, locked: false, visible: true,
          elements: [{ id: 'el-v2', type: 'video' as const, trackId: 'tr-main-2', mediaId: 'm-04', name: 'V2 insert', startTime: 5, duration: 3, sourceStart: 0 }],
        },
      ],
    };
    const hit = elementAtTime(twoMain, 6);
    expect(hit?.id).toBe('el-v2'); // topmost main track wins over el-1
    const below = elementAtTime(twoMain, 2);
    expect(below?.id).toBe('el-1'); // gap in V2 falls through to V1
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A3): the domain-neutral clip fade ---------- */

describe('R23-WA: fadeIn/fadeOut model fields + the effective-fade selector', () => {
  const el1 = () => scene1.tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-1')!;

  it('demo fades seed every main-track video clip (the FX view paints objects on first paint)', () => {
    const main = scene1.tracks.find((t) => t.id === 'tr-main')!;
    for (const id of ['el-1', 'el-2', 'el-3', 'el-4']) {
      const e = main.elements.find((x) => x.id === id)!;
      expect(e.fadeIn).toBeGreaterThan(0);
      expect(e.fadeOut).toBeGreaterThan(0);
      // frame-clean law (the house grid at 24 fps)
      expect(snapToFrame(e.fadeIn!)).toBe(e.fadeIn);
      expect(snapToFrame(e.fadeOut!)).toBe(e.fadeOut);
    }
  });

  it('effectiveFade: audio elements read audioFadeIn/Out, every other kind reads fadeIn/Out (one selector, one owner)', () => {
    const audio = scene1.tracks.find((t) => t.id === 'tr-audio-1')!.elements.find((e) => e.id === 'el-6')!;
    expect(audio.audioFadeIn).toBe(1.0); // the seeded domain stays
    expect(effectiveFade(audio, 'in')).toBe(1.0);
    expect(effectiveFade(audio, 'out')).toBe(2.0);
    expect(effectiveFade(el1(), 'in')).toBe(el1().fadeIn);
    expect(effectiveFade(el1(), 'out')).toBe(el1().fadeOut);
    // missing fields read 0 — no object renders
    const bare = { ...el1(), fadeIn: undefined, fadeOut: undefined };
    expect(effectiveFade(bare, 'in')).toBe(0);
  });

  it('fieldOfFade mirrors the selector (the writer twin — writer and renderer can never disagree)', () => {
    const audio = { id: 'x', type: 'audio' } as ElementJSON;
    const video = { id: 'y', type: 'video' } as ElementJSON;
    expect(fieldOfFade(audio, 'in')).toBe('audioFadeIn');
    expect(fieldOfFade(audio, 'out')).toBe('audioFadeOut');
    expect(fieldOfFade(video, 'in')).toBe('fadeIn');
    expect(fieldOfFade(video, 'out')).toBe('fadeOut');
  });
});

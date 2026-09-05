/* Store law tests (DESIGN D6, audit M2/M5): every action's doc effect,
   history behavior, drag session, interaction lock, selection validation,
   append routing, playback wrap. Strict equality (grid is binary-exact). */

import { describe, expect, it, beforeEach } from 'vitest';
import { useMini } from '../state/useMini';
import { seedDoc } from '../lib/mockData';

const S = () => useMini.getState();

beforeEach(() => {
  S().reset();
});

describe('seed + reset', () => {
  it('seeds the deterministic doc (D5 v2: slack gaps)', () => {
    const doc = S().doc;
    expect(doc.clips).toHaveLength(4);
    expect(doc.tracks.map((t) => t.id)).toEqual(['V1', 'A1']);
    expect(doc.clips.find((c) => c.id === 'c1')).toMatchObject({ start: 0, duration: 3.5 });
    expect(doc.clips.find((c) => c.id === 'c2')).toMatchObject({ start: 4.5, duration: 3.5 });
    expect(doc.clips.find((c) => c.id === 'c4')).toMatchObject({ start: 1.5, duration: 7 });
  });
});

describe('history (commit laws)', () => {
  it('moveClip pushes exactly one entry and undo restores', () => {
    const before = S().doc;
    S().moveClip('c2', 5.5); // free between 4.5 and 9-dur
    expect(S().past).toHaveLength(1);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    S().undo();
    expect(S().doc).toEqual(before);
    expect(S().past).toHaveLength(0);
    expect(S().future).toHaveLength(1);
    S().redo();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
  });

  it('no-op guard: a move that changes nothing pushes NO history', () => {
    S().moveClip('c2', 4.5); // already at 4.5
    expect(S().past).toHaveLength(0);
  });

  it('undo of a delete clears the dangling selection (audit M2)', () => {
    S().select('c2');
    S().deleteSelected();
    expect(S().doc.clips.find((c) => c.id === 'c2')).toBeUndefined();
    expect(S().selectedId).toBeNull(); // validated on commit
    S().undo();
    expect(S().doc.clips.find((c) => c.id === 'c2')).toBeDefined();
    expect(S().selectedId).toBeNull(); // stays cleared — no dangling id
  });

  it('nudge = one history entry per click, neighbor-clamped (m10)', () => {
    S().select('c2');
    S().nudge('c2', 0.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5);
    expect(S().past).toHaveLength(1);
    S().nudge('c2', -0.5);
    S().nudge('c2', -0.5);
    expect(S().past).toHaveLength(3); // one per click, no coalescing in v0.1
    // clamp: c1 ends 3.5 — nudging c2 below 3.5 impossible
    S().nudge('c2', -5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(3.5);
  });
});

describe('drag session (audit M2)', () => {
  it('preview mutates without history; endDrag pushes exactly ONE entry', () => {
    S().beginDrag();
    expect(S().dragActive).toBe(true);
    S().previewMove('c2', 5);
    S().previewMove('c2', 5.5);
    expect(S().past).toHaveLength(0); // no history during preview
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    S().endDrag();
    expect(S().past).toHaveLength(1); // exactly one entry for the gesture
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    S().undo();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
  });

  it('cancelDrag restores the pre-drag doc (Esc)', () => {
    S().beginDrag();
    S().previewMove('c2', 5);
    S().cancelDrag();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().dragActive).toBe(false);
    expect(S().past).toHaveLength(0);
  });

  it('endDrag with NO actual change pushes no history', () => {
    S().beginDrag();
    S().previewMove('c2', 4.5); // same position
    S().endDrag();
    expect(S().past).toHaveLength(0);
  });

  it('interaction lock: commits + commands are suppressed mid-drag', () => {
    S().beginDrag();
    S().moveClip('c2', 6); // suppressed (returns false internally)
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    S().splitAtPlayhead(); // suppressed
    expect(S().doc.clips).toHaveLength(4);
    S().deleteSelected(); // suppressed
    S().undo(); // suppressed
    S().select('c1'); // suppressed
    expect(S().selectedId).toBeNull();
    S().cancelDrag();
  });
});

describe('splitAtPlayhead (audit M1)', () => {
  it('splits the selected clip at the quantized playhead', () => {
    S().select('c2'); // 4.5 → 8
    S().setPlayhead(6.3);
    S().splitAtPlayhead();
    const clips = S().doc.clips;
    expect(clips).toHaveLength(5);
    expect(clips.find((c) => c.id === 'c2')).toMatchObject({ start: 4.5, duration: 2 });
    const right = clips.find((c) => c.id !== 'c2' && c.trackId === 'V1' && c.start === 6.5);
    expect(right).toMatchObject({ duration: 1.5, mediaId: 'm-beach' });
  });

  it('falls back to the topmost clip under the playhead when nothing selected', () => {
    S().setPlayhead(2); // inside c1 (V1) and c4 (A1)
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(5);
  });

  it('toasts (no doc change) when nothing is under the playhead', () => {
    S().setPlayhead(12.4); // inside c3 (9→12.5)
    S().select('c1');
    // c1 not under playhead and selected → fallback scans, finds c3 → splits.
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(5);
    // now truly outside: playhead at end
    S().setPlayhead(12.5);
    S().select(null);
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(5);
    expect(S().toast?.text).toContain('Nothing under the playhead');
  });

  it('rejects sub-1s clips', () => {
    // isolate: remove the A1 clip so the playhead is ONLY inside the sub-1s c2
    S()._commit((doc) => {
      doc.clips = doc.clips.filter((c) => c.id !== 'c4');
      const c = doc.clips.find((x) => x.id === 'c2')!;
      c.duration = 0.5;
    });
    S().setPlayhead(4.75);
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(3); // unchanged
    expect(S().toast?.text).toContain('Nothing under the playhead');
  });});

describe('append routing (audit M5)', () => {
  it('audio → A1, video/image → V1, appended at the track end on-grid', () => {
    S().addClipFromMedia('m-interview'); // audio
    const audio = S().doc.clips.filter((c) => c.trackId === 'A1');
    expect(audio).toHaveLength(2);
    expect(audio[1]).toMatchObject({ start: 8.5, mediaId: 'm-interview' });
    S().addClipFromMedia('m-title'); // image → V1
    const video = S().doc.clips.filter((c) => c.trackId === 'V1');
    expect(video).toHaveLength(4);
    expect(video[3]).toMatchObject({ start: 12.5, mediaId: 'm-title' });
    expect(S().past).toHaveLength(2);
  });
});

describe('playback (audit m1)', () => {
  it('wraps to 0 and continues at contentEnd', () => {
    S().togglePlay(); // playing must be engaged for tick to advance
    S().setPlayhead(12.4);
    S().tick(0.2); // 12.6 >= 12.5 → wrap
    expect(S().playhead).toBe(0);
  });
  it('empty doc: togglePlay never engages + toasts', () => {
    S()._commit((doc) => {
      doc.clips = [];
    });
    S().togglePlay();
    expect(S().playing).toBe(false);
    expect(S().toast?.text).toContain('Nothing to play');
  });
  it('scrub clamps to [0, contentEnd] unquantized', () => {
    S().setPlayhead(3.33);
    expect(S().playhead).toBe(3.33);
    S().setPlayhead(99);
    expect(S().playhead).toBe(12.5);
    S().setPlayhead(-1);
    expect(S().playhead).toBe(0);
  });
});

describe('trimClip end-trim respects media duration (audit M1)', () => {
  it('caps the end at start + media.duration even with room to the right', () => {
    S().select('c1'); // media m-drone duration 4.5; c1 0→3.5, next c2 at 4.5
    // first move c2 away to open room
    S().moveClip('c2', 6);
    S().trimClip('c1', 'end', 10);
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(4.5); // media cap
    expect(S().past).toHaveLength(2);
  });
});

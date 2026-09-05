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

  it('toasts (no doc change) when the selected clip is not under the playhead (review fix #6)', () => {
    S().select('c1');
    S().setPlayhead(12.4); // inside c3 (9→12.5), NOT inside the selected c1
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(4); // unchanged — no silent retarget
    expect(S().toast?.text).toContain('not inside the selected');
  });

  it('toasts when nothing is under the playhead and nothing is selected', () => {
    S().setPlayhead(12.5);
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(4);
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
  it('doc emptied WHILE playing: tick stops playback (review #5 — no zero-length loop)', () => {
    S().togglePlay();
    expect(S().playing).toBe(true);
    S()._commit((doc) => {
      doc.clips = [];
    });
    S().tick(0.1);
    expect(S().playing).toBe(false);
    expect(S().playhead).toBe(0);
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

describe('history cap + undo/redo honesty (review gaps)', () => {
  it('MAX_HISTORY caps the past stack at 50 and drops the oldest', () => {
    for (let i = 0; i < 55; i++) {
      S().nudge('c2', i % 2 === 0 ? 0.5 : -0.5); // every click commits
    }
    expect(S().past).toHaveLength(50);
    for (let i = 0; i < 50; i++) S().undo();
    S().undo(); // stack exhausted
    expect(S().toast?.text).toContain('Nothing to undo');
  });

  it('selection SURVIVES undo of a move (only deletes clear it)', () => {
    S().select('c2');
    S().moveClip('c2', 5);
    S().undo();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().selectedId).toBe('c2');
  });

  it('redo on an empty stack toasts honestly', () => {
    S().redo();
    expect(S().toast?.text).toContain('Nothing to redo');
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

/* ---- R18e: view toggles + defaults ---- */

describe('view toggles (R18e feedback #8/#10/#15/#16)', () => {
  it('snap is OFF by default (feedback #10) and toggles', () => {
    expect(S().snapOn).toBe(false);
    S().toggleSnap();
    expect(S().snapOn).toBe(true);
  });

  it('ripple / filmstrip / audio-lane defaults + toggles', () => {
    expect(S().rippleOn).toBe(false);
    expect(S().filmstripOn).toBe(true);
    expect(S().audioLaneVisible).toBe(true);
    S().toggleRipple();
    S().toggleFilmstrip();
    S().toggleAudioLane();
    expect(S().rippleOn).toBe(true);
    expect(S().filmstripOn).toBe(false);
    expect(S().audioLaneVisible).toBe(false);
  });

  it('toggles are inert mid-drag (interaction lock)', () => {
    S().beginDrag();
    S().toggleSnap();
    S().toggleRipple();
    expect(S().snapOn).toBe(false);
    expect(S().rippleOn).toBe(false);
    S().cancelDrag();
  });
});

/* ---- R18e: cut styles (RH 裁剪开始 / 裁剪结束, feedback #7) ---- */

describe('cutHeadAtPlayhead / cutTailAtPlayhead', () => {
  it('cut head discards the part before the playhead (selection honored)', () => {
    S().select('c2'); // [4.5, 8.0]
    S().setPlayhead(6);
    S().cutHeadAtPlayhead();
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c2).toMatchObject({ start: 6, duration: 2 });
    expect(S().past).toHaveLength(1);
  });

  it('cut tail discards the part after the playhead', () => {
    S().select('c2'); // [4.5, 8.0]
    S().setPlayhead(5.5);
    S().cutTailAtPlayhead();
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c2).toMatchObject({ start: 4.5, duration: 1 });
  });

  it('no selection → topmost clip under the playhead (split-law parity)', () => {
    S().setPlayhead(2); // inside c1 [0,3.5] (V1) and c4 [1.5,8.5] (A1)
    S().cutTailAtPlayhead();
    // topmost = latest start = c4
    const c4 = S().doc.clips.find((c) => c.id === 'c4')!;
    expect(c4.duration).toBe(0.5);
    const c1 = S().doc.clips.find((c) => c.id === 'c1')!;
    expect(c1.duration).toBe(3.5); // untouched
  });

  it('playhead outside the selected clip → honest toast, no doc change', () => {
    S().select('c1');
    S().setPlayhead(10); // outside c1
    S().cutHeadAtPlayhead();
    expect(S().toast?.text).toContain('not inside');
    expect(S().past).toHaveLength(0);
  });

  it('cut head at clip start → nothing to cut (toast, no history)', () => {
    S().select('c2');
    S().setPlayhead(4.5);
    S().cutHeadAtPlayhead();
    expect(S().toast?.text).toContain('Nothing to cut');
    expect(S().past).toHaveLength(0);
  });

  it('with ripple ON, cut head closes the gap (frozen left edge law)', () => {
    S().toggleRipple();
    S().select('c2'); // [4.5, 8.0], follower c3 at [9, 12.5]
    S().setPlayhead(6);
    S().cutHeadAtPlayhead();
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    const c3 = S().doc.clips.find((c) => c.id === 'c3')!;
    // content after 6s remains (2s), left edge FROZEN at 4.5, followers shift left by 1.5
    expect(c2).toMatchObject({ start: 4.5, duration: 2 });
    expect(c3.start).toBe(7.5);
  });
});

/* ---- R18e: ripple edit (feedback #16) ---- */

describe('ripple delete', () => {
  it('ripple ON: followers close the gap, one history entry', () => {
    S().toggleRipple();
    S().select('c2'); // [4.5, 8.0]
    S().deleteSelected();
    const c3 = S().doc.clips.find((c) => c.id === 'c3')!;
    expect(c3.start).toBe(5.5); // 9 - 3.5
    expect(S().doc.clips).toHaveLength(3);
    expect(S().past).toHaveLength(1);
  });

  it('ripple OFF: followers stay (the classic behavior)', () => {
    S().select('c2');
    S().deleteSelected();
    const c3 = S().doc.clips.find((c) => c.id === 'c3')!;
    expect(c3.start).toBe(9);
  });

  it('ripple only moves SAME-track followers', () => {
    S().toggleRipple();
    S().select('c2'); // deleting [4.5, 8.0] on V1; c4 is on A1
    S().deleteSelected();
    const c4 = S().doc.clips.find((c) => c.id === 'c4')!;
    expect(c4.start).toBe(1.5);
  });
});

describe('ripple trim (committed)', () => {
  it('end-trim with ripple pushes/pulls followers, ignoring the neighbor bound', () => {
    S().toggleRipple();
    S().select('c1'); // [0, 3.5], follower c2 at 4.5; media m-drone = 4.5s
    S().trimClip('c1', 'end', 5); // media caps at 4.5 (delta +1) — past c2's start, ripple pushes
    const c1 = S().doc.clips.find((c) => c.id === 'c1')!;
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c1.duration).toBe(4.5);
    expect(c2.start).toBe(5.5); // 4.5 + 1
  });

  it('end-trim with ripple is still bounded by the MEDIA duration', () => {
    S().toggleRipple();
    S().select('c1'); // media m-drone 4.5s
    S().trimClip('c1', 'end', 10);
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(4.5);
  });

  it('no-op ripple trim pushes no history', () => {
    S().toggleRipple();
    S().select('c1');
    S().trimClip('c1', 'end', 3.5); // same as current
    expect(S().past).toHaveLength(0);
  });
});

describe('ripple trim (preview path, snapshot-relative)', () => {
  it('preview events are idempotent from the snapshot — no drift on wobble', () => {
    S().toggleRipple();
    S().select('c1'); // [0, 3.5], follower c2 at 4.5
    S().beginDrag();
    S().previewTrim('c1', 'end', 5);
    S().previewTrim('c1', 'end', 4); // wobble back
    S().previewTrim('c1', 'end', 5); // forward again — same end state
    let c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c2.start).toBe(5.5); // 4.5 + 1 (delta +1 from snapshot)
    S().previewTrim('c1', 'end', 2.5);
    c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c2.start).toBe(3.5); // 4.5 - 1 (delta -1)
    S().endDrag();
    expect(S().past).toHaveLength(1); // ONE entry for the whole session
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(2.5);
  });
});

/* ---- R18e: pool→timeline DnD insert ---- */

describe('insertMediaAt', () => {
  it('exact free spot: places at the quantized drop time on the right lane', () => {
    // V1 is packed to 12.5 — the exact-free spot for a new clip is the tail.
    // m-lower (2.5s) requested at 12.6 → quantized 12.5, free, exact.
    S().insertMediaAt('m-lower', 'V1', 12.6);
    const added = S().doc.clips.find((c) => c.mediaId === 'm-lower')!;
    expect(added).toMatchObject({ trackId: 'V1', duration: 2.5, start: 12.5 });
    expect(S().toast?.text).toContain('12.5s');
  });

  it('occupied spot: bumps to the next gap (3.5..4.5 fits nothing > 1s → tail)', () => {
    // m-gopro 5.5s dropped at 1.0 → no gap fits → tail after c3 (12.5)
    S().insertMediaAt('m-gopro', 'V1', 1.0);
    const added = S().doc.clips.find((c) => c.mediaId === 'm-gopro')!;
    expect(added.start).toBe(12.5);
    expect(S().toast?.text).toContain('next open spot');
  });

  it('audio media only lands on A1 — the store re-validates the routing', () => {
    S().insertMediaAt('m-interview', 'V1', 2);
    expect(S().doc.clips.filter((c) => c.trackId === 'V1')).toHaveLength(3);
    expect(S().toast?.text).toContain('belongs on A1');
    S().insertMediaAt('m-interview', 'A1', 9.4);
    const added = S().doc.clips.find((c) => c.mediaId === 'm-interview' && c.start === 9.5)!;
    expect(added).toBeDefined();
  });

  it('one history entry; drag lock blocks inserts', () => {
    S().insertMediaAt('m-title', 'V1', 8.7);
    expect(S().past).toHaveLength(1);
    S().beginDrag();
    S().insertMediaAt('m-title', 'V1', 8.7);
    S().cancelDrag();
    expect(S().past).toHaveLength(1);
  });
});

/* ---- R18f: review-wave P2/P1 regression tests ---- */

describe('R18f ripple quantize law (review P1-2)', () => {
  it('off-grid follower never overlaps the edited clip after a ripple trim', () => {
    // snap is OFF by default → raw (off-grid) commits are the normal path
    S().moveClip('c2', 3.6); // raw move, sits 0.1s past c1's end (3.5)
    S().toggleRipple();
    S().trimClip('c1', 'end', 3.55); // raw +0.05 delta (sub-grid)
    const c1 = S().doc.clips.find((c) => c.id === 'c1')!;
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    // old bug: per-result quantize rounded c2 DOWN into an overlap
    expect(c1.start + c1.duration).toBeLessThanOrEqual(c2.start + 1e-9);
    expect(c2.start).toBe(3.6); // sub-grid delta → identity, no jump
  });

  it('grid deltas shift followers uniformly (internal spacing preserved)', () => {
    S().moveClip('c2', 4.7); // off-grid
    S().moveClip('c3', 9.9);
    S().toggleRipple();
    S().trimClip('c1', 'end', 4.5); // delta +1 → shift +1 for both followers
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.7);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(10.9);
  });

  it('ripple preview path floors followers at the edited clip new end', () => {
    S().moveClip('c2', 3.6);
    S().toggleRipple();
    S().beginDrag();
    S().previewTrim('c1', 'end', 3.55);
    const c1 = S().doc.clips.find((c) => c.id === 'c1')!;
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c1.start + c1.duration).toBeLessThanOrEqual(c2.start + 1e-9);
    S().cancelDrag();
  });
});

describe('R18f undo/redo round-trips (review P2-2)', () => {
  it('ripple delete → undo restores the doc exactly', () => {
    S().toggleRipple();
    S().select('c2');
    const before = S().doc;
    S().deleteSelected();
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(5.5);
    S().undo();
    expect(S().doc).toEqual(before);
  });

  it('ripple end-trim → undo, then redo', () => {
    S().toggleRipple();
    S().select('c1');
    S().trimClip('c1', 'end', 2.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(3.5);
    S().undo();
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(3.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    S().redo();
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(2.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(3.5);
  });

  it('insertMediaAt → undo removes the inserted clip', () => {
    S().insertMediaAt('m-lower', 'V1', 12.6);
    expect(S().doc.clips).toHaveLength(5);
    S().undo();
    expect(S().doc.clips).toHaveLength(4);
    expect(S().doc.clips.find((c) => c.mediaId === 'm-lower')).toBeUndefined();
  });
});

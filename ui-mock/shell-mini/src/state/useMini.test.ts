/* Store law tests (DESIGN D6, audit M2/M5): every action's doc effect,
   history behavior, drag session, interaction lock, selection validation,
   append routing, playback wrap. Strict equality (grid is binary-exact). */

import { describe, expect, it, beforeEach } from 'vitest';
import { useMini, visibleTracks, boundClips } from '../state/useMini';
import { seedDoc, multiTrackDoc } from '../lib/mockData';

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

  it('nudge = one history entry per click; conflicting nudge REFUSES (R19)', () => {
    S().select('c2');
    S().nudge('c2', 0.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5);
    expect(S().past).toHaveLength(1);
    S().nudge('c2', -0.5);
    S().nudge('c2', -0.5);
    expect(S().past).toHaveLength(3); // one per click, no coalescing in v0.1
    // R19: the nudge routes the moveClip REJECT law — nudging into a
    // neighbor refuses with a toast (was: silent clamp-park, the same
    // one-lane street the drag overhaul removes). c2 at 4 is free; a
    // nudge to 2.5 would overlap c1 → refused.
    S().nudge('c2', -1.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4); // unchanged
    expect(S().past).toHaveLength(3); // refusal = no history entry
    expect(S().toast?.kind).toBe('error');
    expect(S().toast?.text).toContain('No room');
    // negative target: refused too (OT requireNonNegativeTicks)
    S().nudge('c2', -5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4);
    expect(S().toast?.text).toContain('at or after 0');
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
    S().setRulerEnd(12.5); // the mounted Timeline always publishes ≥ contentEnd
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
    S().setRulerEnd(12.5); // mounted-Timeline parity (R18i: scrub clamps to rulerEnd)
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
  it('scrub clamps to [0, rulerEnd] unquantized (R18i — the published ruler surface)', () => {
    S().setRulerEnd(12.5); // mounted-Timeline parity: rulerEnd ≥ contentEnd
    S().setPlayhead(3.33);
    expect(S().playhead).toBe(3.33);
    S().setPlayhead(99);
    expect(S().playhead).toBe(12.5);
    S().setPlayhead(-1);
    expect(S().playhead).toBe(0);
  });
  it('R18i: scrub PAST contentEnd follows the ruler (the reported bug — playhead pinned at the last clip edge)', () => {
    // the visible ruler surface (viewport coverage) extends past the last
    // clip: setPlayhead must keep following the pointer out there
    S().setRulerEnd(20);
    S().setPlayhead(15.25);
    expect(S().playhead).toBe(15.25); // past contentEnd 12.5, on the ruler
    S().setPlayhead(20.5);
    expect(S().playhead).toBe(20); // clamped at the surface edge
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
    // first move c2 away to open room (R19: 5.5 is a free span — c2 ends
    // at 9 exactly where c3 begins; the old clamped move to 6 would now
    // be REFUSED as an overlap with c3)
    S().moveClip('c2', 5.5);
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

  it('no selection → the bound VIDEO lane wins over audio (PR69 C4/C52: NLE topmost = track order)', () => {
    S().setPlayhead(2); // inside c1 [0,3.5] (V1) and c4 [1.5,8.5] (A1)
    S().cutTailAtPlayhead();
    // the bound video lane outranks the later-starting audio clip — the
    // old law picked c4 (latest start across ALL tracks), which split an
    // audio clip an NLE-trained user never expected
    const c1 = S().doc.clips.find((c) => c.id === 'c1')!;
    expect(c1.duration).toBe(2); // trimmed at the quantized playhead 2.0
    const c4 = S().doc.clips.find((c) => c.id === 'c4')!;
    expect(c4.duration).toBe(7); // untouched
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

/* ---- R18j layout state (threads #13/#14/#15/#16/#19) ------------- */

describe('R18j layout state', () => {
  it('defaults: everything expanded, 16:9, no max', () => {
    expect(S().poolCollapsed).toBe(false);
    expect(S().inspectorCollapsed).toBe(false);
    expect(S().timelineMinimized).toBe(false);
    expect(S().viewerMax).toBe(false);
    expect(S().viewerAspect).toBe('16:9');
  });

  it('toggles flip the flags; setters are idempotent (no churn)', () => {
    S().togglePool();
    S().toggleInspector();
    S().toggleTimelineMin();
    S().toggleViewerMax();
    expect(S().poolCollapsed).toBe(true);
    expect(S().inspectorCollapsed).toBe(true);
    expect(S().timelineMinimized).toBe(true);
    expect(S().viewerMax).toBe(true);
    S().setPoolCollapsed(true); // already true — no-op
    expect(S().poolCollapsed).toBe(true);
    S().setPoolCollapsed(false);
    expect(S().poolCollapsed).toBe(false);
  });

  it('setViewerAspect only accepts the advertised ratios (strays fall back at read time)', () => {
    S().setViewerAspect('4:3');
    expect(S().viewerAspect).toBe('4:3');
    S().setViewerAspect('2.39:1');
    expect(S().viewerAspect).toBe('2.39:1');
  });

  it('layout actions are drag-gated (a relayout mid-gesture breaks pointer math)', () => {
    S().beginDrag();
    S().togglePool();
    S().toggleViewerMax();
    S().setTimelineMinimized(true);
    S().setViewerAspect('1:1');
    expect(S().poolCollapsed).toBe(false);
    expect(S().viewerMax).toBe(false);
    expect(S().timelineMinimized).toBe(false);
    expect(S().viewerAspect).toBe('16:9');
    S().endDrag();
    S().togglePool();
    expect(S().poolCollapsed).toBe(true);
  });

  it('reset clears the layout wave too', () => {
    S().togglePool();
    S().toggleViewerMax();
    S().setViewerAspect('9:16');
    S().reset();
    expect(S().poolCollapsed).toBe(false);
    expect(S().viewerMax).toBe(false);
    expect(S().viewerAspect).toBe('16:9');
  });
});

/* ---- R18k track binding (threads #21/#23/#3) ---------------------- */

describe('R18k track binding + video-only mode', () => {
  it('defaults: paired mode, V1/A1 binding, unlocked', () => {
    expect(S().trackMode).toBe('paired');
    expect(S().boundVideoTrack).toBe('V1');
    expect(S().boundAudioTrack).toBe('A1');
    expect(S().trackBindingLocked).toBe(false);
  });

  it('binding actions are drag-gated and idempotent', () => {
    S().beginDrag();
    S().setTrackMode('video');
    S().setBoundVideoTrack('V2');
    S().setTrackBindingLocked(true);
    expect(S().trackMode).toBe('paired');
    expect(S().boundVideoTrack).toBe('V1');
    expect(S().trackBindingLocked).toBe(false);
    S().endDrag();
    S().setTrackMode('video');
    S().setTrackMode('video'); // idempotent — no churn
    expect(S().trackMode).toBe('video');
  });

  it('rebinding clears a selection that left the visible world, keeps one that joined it', () => {
    useMini.setState({ doc: multiTrackDoc(), selectedId: 'c2' }); // c2 on V1
    S().setBoundVideoTrack('V2');
    expect(S().selectedId).toBeNull(); // c2 is invisible now — not a trap
    S().select('c5'); // c5 on V2
    S().setBoundVideoTrack('V2'); // same binding — no-op, selection survives
    expect(S().selectedId).toBe('c5');
  });

  it('locked bindings refuse rebinds (host-injected environment)', () => {
    useMini.setState({ doc: multiTrackDoc(), trackBindingLocked: true });
    S().setBoundVideoTrack('V2');
    S().setBoundAudioTrack('A2');
    expect(S().boundVideoTrack).toBe('V1');
    expect(S().boundAudioTrack).toBe('A1');
  });

  it('only real tracks of the right kind bind (stray ids rejected)', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().setBoundVideoTrack('A1'); // audio track — wrong kind
    S().setBoundAudioTrack('V2'); // video track — wrong kind
    S().setBoundVideoTrack('V9'); // does not exist
    expect(S().boundVideoTrack).toBe('V1');
    expect(S().boundAudioTrack).toBe('A1');
    S().setBoundVideoTrack('V2');
    expect(S().boundVideoTrack).toBe('V2');
  });

  it('selection law (review P2-3): a selection survives iff its clip stays VISIBLE', () => {
    useMini.setState({ doc: multiTrackDoc(), selectedId: 'c2' }); // c2 on V1
    S().setBoundVideoTrack('V2');
    expect(S().selectedId).toBeNull(); // c2 is invisible now — not a trap
    useMini.setState({ selectedId: 'c4' }); // c4 on A1
    S().setBoundVideoTrack('V1'); // video rebind — A1 still visible
    expect(S().selectedId).toBe('c4'); // the audio selection SURVIVES the video rebind
    S().setBoundVideoTrack('V2'); // back to the V2 world
    S().select('c5'); // c5 on V2
    S().setTrackMode('video'); // video-only: V2 bound → c5 still visible
    expect(S().selectedId).toBe('c5'); // survives the mode switch too
    S().setTrackMode('video'); // idempotent — no churn
    expect(S().trackMode).toBe('video');
  });

  it('setTrackMode is locked-gated (a pinned environment owns the mode)', () => {
    useMini.setState({ trackBindingLocked: true });
    S().setTrackMode('video');
    expect(S().trackMode).toBe('paired');
    useMini.setState({ trackBindingLocked: false });
    S().setTrackMode('video');
    expect(S().trackMode).toBe('video');
  });

  it('visibleTracks: the bound pair in paired mode, video alone in video mode', () => {
    const doc = multiTrackDoc();
    expect(visibleTracks(doc, 'paired', 'V1', 'A1').map((t) => t.id)).toEqual(['V1', 'A1']);
    expect(visibleTracks(doc, 'paired', 'V2', 'A2').map((t) => t.id)).toEqual(['V2', 'A2']);
    expect(visibleTracks(doc, 'video', 'V2', 'A2').map((t) => t.id)).toEqual(['V2']);
    expect(visibleTracks(doc, 'video', 'V1', 'A1').map((t) => t.id)).toEqual(['V1']);
    // stray binding (track vanished): empty world, not a crash
    expect(visibleTracks(doc, 'paired', 'V9', 'A1')).toEqual([]);
  });

  it('boundClips: only clips on the bound tracks are the mini world', () => {
    const doc = multiTrackDoc();
    expect(boundClips(doc, 'paired', 'V1', 'A1').map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(boundClips(doc, 'video', 'V1', 'A1').map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(boundClips(doc, 'video', 'V2', 'A1').map((c) => c.id)).toEqual(['c5', 'c6']);
    expect(boundClips(doc, 'paired', 'V2', 'A2').map((c) => c.id).sort()).toEqual(['c5', 'c6', 'c7']);
  });

  it('addClipFromMedia targets the BOUND track, not a global constant', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().setBoundVideoTrack('V2');
    const before = S().doc.clips.filter((c) => c.mediaId === 'm-sunset'); // just the seed c6
    S().addClipFromMedia('m-sunset'); // video → bound V2, after c6 (end 12)
    const after = S().doc.clips.filter((c) => c.mediaId === 'm-sunset');
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((c) => c.start === 12 && c.trackId === 'V2')).toBeDefined();
    S().undo();
    expect(S().doc.clips.filter((c) => c.mediaId === 'm-sunset')).toHaveLength(before.length);
  });

  it('video-only mode: audio/image appends are refused with an honest toast', () => {
    S().setTrackMode('video');
    S().addClipFromMedia('m-interview'); // audio
    expect(S().doc.clips.filter((c) => c.mediaId === 'm-interview')).toHaveLength(1); // only the seed c4
    expect(S().toast?.text).toContain('Video-only mode');
    S().addClipFromMedia('m-title'); // image — strictly video media (thread #23)
    expect(S().doc.clips.filter((c) => c.mediaId === 'm-title')).toHaveLength(1); // only the seed c3
  });

  it('insertMediaAt re-validates against the binding (drop zones can lie)', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().setBoundVideoTrack('V2');
    // a drop claiming V1 while the mini binds V2 → honest refusal
    S().insertMediaAt('m-sunset', 'V1', 13);
    expect(S().doc.clips.filter((c) => c.mediaId === 'm-sunset' && c.start === 13)).toHaveLength(0);
    expect(S().toast?.text).toContain('belongs on V2');
    // the bound lane accepts
    S().insertMediaAt('m-sunset', 'V2', 13);
    expect(S().doc.clips.find((c) => c.mediaId === 'm-sunset' && c.trackId === 'V2' && c.start === 13)).toBeDefined();
  });

  it('video-only mode: no audio lane to land on — insert refuses', () => {
    S().setTrackMode('video');
    S().insertMediaAt('m-interview', 'A1', 0);
    expect(S().doc.clips.filter((c) => c.mediaId === 'm-interview')).toHaveLength(1); // only the seed c4
    expect(S().toast?.text).toContain('Video-only mode');
  });

  it('playback world follows the binding (wrap + empty guard)', () => {
    useMini.setState({ doc: multiTrackDoc(), playhead: 0, playing: true, trackMode: 'video', boundVideoTrack: 'V2' });
    S().tick(0.5);
    expect(S().playhead).toBe(0.5); // plays into the V2 world (end = 12)
    // a world with no clips = nothing to play
    useMini.setState({ doc: { tracks: seedDoc().tracks, media: seedDoc().media, clips: [] }, playing: true });
    S().tick(0.5);
    expect(S().playing).toBe(false); // stopped, never a zero-length loop
    expect(S().playhead).toBe(0);
  });

  it('reset restores the default binding', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().setBoundVideoTrack('V2');
    S().setBoundAudioTrack('A2');
    S().setTrackMode('video');
    S().setTrackBindingLocked(true);
    S().reset();
    expect(S().trackMode).toBe('paired');
    expect(S().boundVideoTrack).toBe('V1');
    expect(S().boundAudioTrack).toBe('A1');
    expect(S().trackBindingLocked).toBe(false);
  });
});

/* ---- R19: moveClip reject law (the OT timeline.move seam) ---- */

describe('R19 moveClip (overlap-REJECT, the OT wire law)', () => {
  it('commits a free move; one history entry', () => {
    S().select('c2');
    S().moveClip('c2', 5.5); // [5.5,9) touches c3 at 9 — free
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().past).toHaveLength(1);
  });

  it('REFUSES an overlapping move: toast, no doc change, no history', () => {
    S().select('c2');
    S().moveClip('c2', 2); // [2,5.5) overlaps c1 [0,3.5)
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().past).toHaveLength(0);
    expect(S().toast?.kind).toBe('error');
    expect(S().toast?.text).toContain('No room at 2.0s');
  });

  it('REFUSES a negative start (OT requireNonNegativeTicks)', () => {
    S().select('c2');
    S().moveClip('c2', -1);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().toast?.text).toContain('at or after 0');
  });

  it('silent while a drag session owns the lock (guard precedes the toast)', () => {
    S().beginDrag();
    S().moveClip('c2', 2); // suppressed mid-drag — no toast spam
    expect(S().toast).toBeNull();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    S().cancelDrag();
  });
});

/* ---- R20: previewMove — the OT-faithful preview (the comedy fix) ---- */

describe('R21 previewMove (user P0 revert: the R18k clamp law — neighbors NEVER move, the mover clamps)', () => {
  it('free span: plain move, idempotent across repeated events', () => {
    S().beginDrag();
    S().previewMove('c2', 5.5); // [5.5,9) ends exactly at c3's start — touching, not overlapping
    S().previewMove('c2', 5.5);
    S().previewMove('c2', 5.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9); // nobody moved
    S().endDrag();
    expect(S().past).toHaveLength(1);
  });

  it('THE COMEDY PINNED: dragging c3 across c1/c2 — neighbors stay at snapshot positions', () => {
    // the R19 law teleported c2 +297px mid-gesture (insertPlacement ran
    // per pointermove, mutating the live doc). Every round agreed: only
    // the mover moves during a drag. Every event, exact positions.
    S().beginDrag();
    // c3 is the LAST V1 clip: its legal range is [c2.end 8, inf) — the
    // clamp law parks any lower request at 8 (the neighbor bound)
    for (const r of [8.4, 9, 9.5, 10.5, 12, 20]) {
      S().previewMove('c3', r);
      expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0);
      expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
      expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(r);
      expect(S().doc.clips.find((c) => c.id === 'c4')!.start).toBe(1.5); // A1 untouched
    }
    // sweeping LEFT below the bound clamps at c2's end — c2 never moves
    S().previewMove('c3', 2);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(8); // clamped
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    S().cancelDrag();
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9); // restored
    expect(S().past).toHaveLength(0); // no history for a canceled gesture
  });

  it('conflicting span CLAMPS: the mover parks at the neighbor bound (no overlap is ever rendered)', () => {
    S().beginDrag();
    S().previewMove('c3', 2); // span [2,5.5) would sit ON c1/c2 → clamped to c2's end
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(8); // c2.end (the lo bound)
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0); // c1 DOES NOT teleport
    S().cancelDrag();
  });

  it('cancelDrag restores the snapshot after a clamped preview', () => {
    S().beginDrag();
    S().previewMove('c3', 2);
    S().cancelDrag();
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9);
  });

  it('a degenerate span (no room between neighbors) parks at the neighbor end', () => {
    // c2 (dur 3.5) between c1.end 3.5 and c2-only gap... build a tight pair:
    // c1 [0,4.5) + c3 [9,12.5): moving c2 (dur 3.5) has room [4.5, 5.5);
    // ask 8 → clamps to 5.5 (c3.start − dur)
    S().beginDrag();
    S().previewMove('c2', 8);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    S().cancelDrag();
  });
});

/* ---- R21: endDrag — the R18k law (plain commit, restored by the user P0 revert) ---- */

describe('R21 endDrag (the R18k plain-commit law at the UP)', () => {
  it('free drop: ONE history entry; undo restores (didMove law)', () => {
    S().select('c2');
    S().beginDrag();
    S().previewMove('c2', 5.5); // [5.5,9) touches c3's start — free
    S().endDrag();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().past).toHaveLength(1);
    expect(S().selectedId).toBe('c2'); // selection survives a plain move
    S().undo();
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
  });

  it('a drop that returned to the snapshot position commits NOTHING (cancel law)', () => {
    S().beginDrag();
    S().previewMove('c2', 8); // wander
    S().previewMove('c2', 4.5); // ...and return exactly to rest
    S().endDrag();
    expect(S().past).toHaveLength(0); // changed=false → no entry
    expect(S().future).toHaveLength(0);
  });

  it('a conflict-bound drag commits the CLAMPED position (the preview is the truth)', () => {
    S().select('c3');
    S().beginDrag();
    S().previewMove('c3', 2); // parks at c2's end (the lo bound) — never overlaps
    S().endDrag();
    const moved = S().doc.clips.find((c) => c.id === 'c3')!;
    expect(moved.start).toBe(8);
    expect(moved.trackId).toBe('V1'); // never leaves its lane
    expect(S().doc.tracks.map((t) => t.id)).toEqual(['V1', 'A1']); // nothing minted
    expect(S().past).toHaveLength(1);
    S().undo();
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9);
  });

  it('locked binding changes nothing: the clamp law has no refusal path', () => {
    useMini.setState({ trackBindingLocked: true });
    S().select('c3');
    S().beginDrag();
    S().previewMove('c3', 2); // clamps to 8
    S().endDrag();
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(8); // clamped commit
    expect(S().past).toHaveLength(1); // plain entry — no escape existed to refuse
  });

  it('the audio lane never moves for a video drag (cross-track law)', () => {
    S().beginDrag();
    S().previewMove('c3', 0.5); // span covers c4's A1 range — A1 is a parallel world
    expect(S().doc.clips.find((c) => c.id === 'c4')!.start).toBe(1.5);
    S().cancelDrag();
  });
});

/* ---- R19: track selection (thread #47) ---- */

describe('R19 track selection', () => {
  it('selectTrack sets the subject; clip select replaces it (mutual exclusion)', () => {
    S().selectTrack('V1');
    expect(S().selectedTrackId).toBe('V1');
    expect(S().selectedId).toBeNull();
    S().select('c2');
    expect(S().selectedId).toBe('c2');
    expect(S().selectedTrackId).toBeNull();
    S().selectTrack('A1');
    expect(S().selectedTrackId).toBe('A1');
    expect(S().selectedId).toBeNull();
  });

  it('unknown track ids are refused', () => {
    S().selectTrack('nope');
    expect(S().selectedTrackId).toBeNull();
  });

  it('heals on rebind: A2 selected, audio rebinds to A1 → selection clears', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().setBoundAudioTrack('A2');
    S().selectTrack('A2');
    expect(S().selectedTrackId).toBe('A2');
    S().setBoundAudioTrack('A1');
    expect(S().selectedTrackId).toBeNull();
  });

  it('heals on mode switch to video-only (A1 selection leaves the world)', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().selectTrack('A1');
    S().setTrackMode('video');
    expect(S().selectedTrackId).toBeNull();
  });

  it('reset() clears the track selection', () => {
    S().selectTrack('V1');
    S().reset();
    expect(S().selectedTrackId).toBeNull();
  });

  it('_validateSelection heals a doc swap that strands the track (undo)', () => {
    useMini.setState({ doc: multiTrackDoc() });
    S().selectTrack('V2');
    S().select('c5'); // V2 clip → history entry via a move? select has no history; use nudge
    // R21 (P0 revert): plain-doc entries again
    useMini.setState({
      past: [seedDoc()],
    });
    S().undo(); // doc back to the single-pair seed (no V2)
    expect(S().selectedTrackId).toBeNull();
  });
});

/* ---- R19: seekToClipHead (thread #53) ---- */

describe('R19 seekToClipHead (edit-point walk-back)', () => {
  it('seeks the head of the clip under the playhead', () => {
    useMini.setState({ playhead: 5 }); // inside c2 [4.5,8)
    S().seekToClipHead();
    expect(S().playhead).toBe(4.5);
  });

  it('sitting exactly ON a head steps to the previous edit point', () => {
    useMini.setState({ playhead: 4.5 });
    S().seekToClipHead();
    expect(S().playhead).toBe(0); // c1's head
    useMini.setState({ playhead: 0 });
    S().seekToClipHead();
    expect(S().playhead).toBe(0); // walks to the floor
  });

  it('in a gap: the most recent head before the playhead', () => {
    useMini.setState({ playhead: 4 }); // gap between c1 end 3.5 and c2 start 4.5
    S().seekToClipHead();
    expect(S().playhead).toBe(0);
  });

  it('empty video world: seeks 0', () => {
    useMini.setState({ doc: { tracks: seedDoc().tracks, media: seedDoc().media, clips: [] } });
    useMini.setState({ playhead: 3 });
    S().seekToClipHead();
    expect(S().playhead).toBe(0);
  });

  it('skips audio-only clips (the viewer world)', () => {
    useMini.setState({ playhead: 2 }); // inside c4 [1.5,8.5) on A1 — not the video world
    S().seekToClipHead();
    expect(S().playhead).toBe(0); // falls to the most recent VIDEO head
  });
});

/* ---- R19: zoom ladder ---- */

describe('R19 zoom ladder (9 steps)', () => {
  it('clamps at the ladder top (index 8) and floor (0)', () => {
    S().setZoomStep(99);
    expect(S().zoomStep).toBe(8);
    S().setZoomStep(-5);
    expect(S().zoomStep).toBe(0);
  });
});

/* ---- PR69 (review round): the flagged laws, pinned ---- */

describe('PR69 C15: append never lands below the tail', () => {
  it('an off-grid raw trim end does not let the append overlap it', () => {
    // snap is OFF by default → raw pointer trims commit off-grid ends
    // (the documented normal path). c3 [9,12.5] → end-trim to 12.2.
    S().trimClip('c3', 'end', 12.2);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.duration).toBeCloseTo(3.2, 9);
    // appending any media must start at/after 12.2 — quantize(12.2) = 12.0
    // (round-to-nearest) would OVERLAP c3's tail and void neighborBounds.
    S().addClipFromMedia('m-drone');
    const appended = S().doc.clips.find((c) => c.mediaId === 'm-drone' && c.start >= 12);
    expect(appended).toBeDefined();
    expect(appended!.start).toBeGreaterThanOrEqual(12.2);
    const overlap = S().doc.clips.some(
      (a, i, all) =>
        a.trackId === 'V1' &&
        all.some((b, j) => j !== i && b.trackId === 'V1' && a.start < b.start + b.duration - 1e-9 && a.start + a.duration > b.start + 1e-9),
    );
    expect(overlap).toBe(false); // the no-overlap invariant survives
  });

  it('an on-grid tail appends exactly at the tail (unchanged law)', () => {
    S().addClipFromMedia('m-drone');
    const v1 = S().doc.clips.filter((c) => c.trackId === 'V1');
    expect(v1.at(-1)).toMatchObject({ start: 12.5, mediaId: 'm-drone' });
  });
});

describe('PR69 C19: the interaction lock finally covers tick', () => {
  it('tick freezes the playhead while dragActive (the magnet field is static mid-gesture)', () => {
    useMini.setState({ playhead: 3, playing: true });
    S().beginDrag();
    S().tick(0.5);
    expect(S().playhead).toBe(3); // was 3.5 — the rAF writer bypassed the lock
    S().endDrag();
    S().tick(0.5);
    expect(S().playhead).toBe(3.5); // playback resumes the frame after the session
  });
});

describe('PR69 C52/C4: split/cut fallbacks live in the BOUND world', () => {
  it('video-only bound to V2 never splits the unbound V1 (the phantom-undo case)', () => {
    useMini.setState({
      doc: multiTrackDoc(),
      trackMode: 'video',
      boundVideoTrack: 'V2',
      selectedId: null,
    });
    const before = S().doc;
    // t=7: inside V1 c2 [4.5,8) but in the V2 GAP (c5 ends 6.5, c6 at 8) —
    // the unbound V1 clip is the ONLY candidate the old fallback could hit
    useMini.setState({ playhead: 7 });
    S().splitAtPlayhead();
    expect(S().doc).toEqual(before); // no invisible mutation, no history
    expect(S().past).toHaveLength(0);
    expect(S().toast?.text).toContain('Nothing under the playhead');
  });

  it('video-only bound to V2 splits the VISIBLE V2 clip (not the unbound V1)', () => {
    useMini.setState({
      doc: multiTrackDoc(),
      trackMode: 'video',
      boundVideoTrack: 'V2',
      selectedId: null,
    });
    // t=10: inside BOTH V1 c3 [9,12.5] (unbound) and V2 c6 [8,12) (bound)
    useMini.setState({ playhead: 10 });
    S().splitAtPlayhead();
    const v2 = S().doc.clips.filter((c) => c.trackId === 'V2');
    expect(v2).toHaveLength(3); // c5 + c6 split at 10 → two products
    expect(S().doc.clips.find((c) => c.id === 'c3')!.duration).toBe(3.5); // the UNBOUND V1 clip: untouched
    expect(S().past).toHaveLength(1);
  });

  it('paired mode: the bound VIDEO lane outranks the later-starting audio clip', () => {
    // seed: playhead 2 is inside c1 (V1, start 0) and c4 (A1, start 1.5) —
    // the old sort picked c4 (latest start); NLE topmost = track order
    useMini.setState({ playhead: 2, selectedId: null });
    S().splitAtPlayhead();
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(2);
    expect(S().doc.clips.find((c) => c.id === 'c4')!.duration).toBe(7);
  });
});

describe('PR69 C48: split keeps the LEFT half selected (both paths)', () => {
  it('selected-clip split: selection follows the left product', () => {
    S().select('c2'); // [4.5,8)
    useMini.setState({ playhead: 6 });
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(5);
    expect(S().selectedId).toBe('c2'); // the left half keeps the id
    // and the keyboard surface has its target: Del removes the left half
    S().deleteSelected();
    expect(S().doc.clips.find((c) => c.id === 'c2')).toBeUndefined();
  });

  it('fallback split: the never-selected target becomes selected', () => {
    useMini.setState({ playhead: 2, selectedId: null });
    S().splitAtPlayhead();
    expect(S().doc.clips).toHaveLength(5);
    expect(S().selectedId).toBe('c1'); // the split product the user is editing
    S().deleteSelected(); // keyboard ops keep their target
    expect(S().doc.clips).toHaveLength(4);
  });
});

describe('PR69 C53: the pending-gesture window', () => {
  it('opens at pointerdown and closes at end (sub-threshold included)', () => {
    expect(S().gesturePending).toBe(false);
    S().beginPendingGesture();
    expect(S().gesturePending).toBe(true);
    S().endPendingGesture();
    expect(S().gesturePending).toBe(false);
  });

  it('an ACTIVE drag supersedes the pending window (one owner)', () => {
    S().beginDrag();
    S().beginPendingGesture(); // a second pointerdown mid-drag: rejected
    expect(S().gesturePending).toBe(false);
    S().endDrag();
  });

  it('endDrag/cancelDrag sweep the flag too (direct-API belt)', () => {
    S().beginPendingGesture();
    S().beginDrag();
    S().endDrag();
    expect(S().gesturePending).toBe(false);
  });
});

describe('R2-a P3-c: commits obey the pending window too', () => {
  it('trimClip is inert while a scrub holds the window open (the keyboard trim reached commit)', () => {
    S().beginPendingGesture();
    S().trimClip('c1', 'end', 3); // the old law: one history entry mid-scrub
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(3.5); // untouched
    expect(S().past).toHaveLength(0);
    S().endPendingGesture();
    S().trimClip('c1', 'end', 3);
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(3);
    expect(S().past).toHaveLength(1); // live after the release
  });
});

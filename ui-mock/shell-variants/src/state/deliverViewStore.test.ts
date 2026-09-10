/* deliverViewStore — R24-W4 (DESIGN-R24 §3 W4 item 4, F5's P2): the
   module-level deliver view store (jobs + showQueue lifted out of
   DeliverPage's component-local useState — the unmount-survival law).
   Pins (all store-level, NO component mounted — the no-component law is
   itself the point: the queue + the mock render timer live at module
   scope, so a page switch never loses them):
   - the pristine fixture: 1 failed + 3 done, IDLE (no running row), the
     queue view hidden (the preview owns the center, #88);
   - queueExport: appends a queued row minted from the fixture tail +
     auto-shows the queue view (#89) + ARMS the timer (the probe);
   - the tick walk: queued → running +25%/tick → done 'just now'
     (4 × 500ms, FIFO — the FIRST queued/running row advances);
   - the timer self-stops at completion + re-arms on the next export;
   - toggleShowQueue: the center-view flag's single writer, both ways;
   - resetDeliverView: the pristine fixture + DISARMED timer + the id
     counter restored (the containment seam DeliverPage.test leans on);
   - __mockTimerActive: the containment probe itself. */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useDeliverView, __mockTimerActive } from './deliverViewStore';

const S = () => useDeliverView.getState();
const reset = () => S().resetDeliverView();

/* fake timers for the whole file: the tick walk IS the subject. The reset
 * disarms the (fake) interval while it is still fake; real timers return
 * after — a real 500ms interval must never survive this file. */
beforeEach(() => {
  vi.useFakeTimers();
  reset();
});

afterEach(() => {
  reset();
  vi.useRealTimers();
});

describe('deliverViewStore (R24-W4, F5 P2) — the module-level view state', () => {
  it('boots the pristine fixture: 1 failed + 3 done, IDLE (no running row) + the queue view hidden', () => {
    expect(S().jobs).toHaveLength(4);
    expect(S().jobs.filter((j) => j.state === 'failed')).toHaveLength(1);
    expect(S().jobs.filter((j) => j.state === 'done')).toHaveLength(3);
    // R22 W5 (#88): the queue boots IDLE — the preview owns the center
    expect(S().jobs.some((j) => j.state === 'running' || j.state === 'queued')).toBe(false);
    expect(S().showQueue).toBe(false);
    expect(__mockTimerActive()).toBe(false);
  });

  it('queueExport: appends a queued row minted from the fixture tail + auto-shows the queue view (#89) + ARMS the timer', () => {
    S().queueExport({ name: 'Beach Doc — Rough Cut — 1080p · In–Out.fcpxml', bundle: true });
    expect(S().jobs).toHaveLength(5);
    expect(S().jobs.at(-1)).toMatchObject({
      id: 'j-4', // the fixture tail (j-0..j-3) — deterministic mint
      name: 'Beach Doc — Rough Cut — 1080p · In–Out.fcpxml',
      progress: 0,
      state: 'queued',
      time: '',
      bundle: true,
    });
    expect(S().showQueue).toBe(true); // queueing flips the center to the queue
    expect(__mockTimerActive()).toBe(true);
  });

  it('the tick walk: queued → running +25%/tick → done "just now" (4 × 500ms, one job)', () => {
    S().queueExport({ name: 'a.mp4' });
    vi.advanceTimersByTime(500); // tick 1
    expect(S().jobs.at(-1)).toMatchObject({ state: 'running', progress: 25 });
    vi.advanceTimersByTime(500); // tick 2
    expect(S().jobs.at(-1)!.progress).toBe(50);
    vi.advanceTimersByTime(500); // tick 3
    expect(S().jobs.at(-1)).toMatchObject({ state: 'running', progress: 75 });
    vi.advanceTimersByTime(500); // tick 4: done
    expect(S().jobs.at(-1)).toMatchObject({ state: 'done', progress: 100, time: 'just now' });
  });

  it('FIFO: the FIRST queued/running row advances — a later queued row waits its turn', () => {
    S().queueExport({ name: 'first.mp4' });
    S().queueExport({ name: 'second.mp4' });
    vi.advanceTimersByTime(500);
    expect(S().jobs.at(-2)).toMatchObject({ state: 'running', progress: 25 }); // first runs
    expect(S().jobs.at(-1)).toMatchObject({ state: 'queued', progress: 0 });   // second waits
    vi.advanceTimersByTime(1500); // first → done
    expect(S().jobs.at(-2)).toMatchObject({ state: 'done', time: 'just now' });
    expect(S().jobs.at(-1)).toMatchObject({ state: 'queued' });
    vi.advanceTimersByTime(500); // now the second starts
    expect(S().jobs.at(-1)).toMatchObject({ state: 'running', progress: 25 });
  });

  it('the timer SELF-STOPS at completion (the probe reads false) + re-arms on the next export', () => {
    S().queueExport({ name: 'a.mp4' });
    expect(__mockTimerActive()).toBe(true);
    vi.advanceTimersByTime(2000); // walked to done
    expect(S().jobs.at(-1)!.state).toBe('done');
    expect(__mockTimerActive()).toBe(false); // self-stopped — nothing left to walk
    // idle ticks after the stop are harmless (the interval is GONE, but even
    // a stray tick self-stops on an empty queue — belt and braces)
    vi.advanceTimersByTime(5000);
    expect(S().jobs.at(-1)!.state).toBe('done');
    // the next export re-arms it
    S().queueExport({ name: 'b.mp4' });
    expect(__mockTimerActive()).toBe(true);
    vi.advanceTimersByTime(500);
    expect(S().jobs.at(-1)).toMatchObject({ state: 'running', progress: 25 });
  });

  it('the timer keeps walking while NO component is mounted (the no-component store pin — module scope, not React state)', () => {
    // no render anywhere in this test: the queue + timer are store-owned
    S().queueExport({ name: 'a.mp4' });
    vi.advanceTimersByTime(1000); // two ticks, zero components
    expect(S().jobs.at(-1)).toMatchObject({ state: 'running', progress: 50 });
    vi.advanceTimersByTime(1000);
    expect(S().jobs.at(-1)).toMatchObject({ state: 'done', time: 'just now' });
  });

  it('toggleShowQueue flips the center-view flag both ways (the single writer)', () => {
    expect(S().showQueue).toBe(false);
    S().toggleShowQueue();
    expect(S().showQueue).toBe(true);
    S().toggleShowQueue();
    expect(S().showQueue).toBe(false);
  });

  it('resetDeliverView restores the pristine fixture + DISARMS the timer (the containment seam)', () => {
    S().queueExport({ name: 'a.mp4' });
    vi.advanceTimersByTime(500); // mid-render
    expect(__mockTimerActive()).toBe(true);
    reset();
    expect(S().jobs).toHaveLength(4); // the pristine §4.2 fixture again
    expect(S().showQueue).toBe(false);
    expect(__mockTimerActive()).toBe(false); // the walking timer is dead
    // the reset also arms nothing: time passes, nothing changes
    vi.advanceTimersByTime(5000);
    expect(S().jobs).toHaveLength(4);
  });

  it('__mockTimerActive: false at boot, true while anything is queued/running, false after completion (the containment probe)', () => {
    expect(__mockTimerActive()).toBe(false);
    S().queueExport({ name: 'a.mp4' });
    expect(__mockTimerActive()).toBe(true);
    vi.advanceTimersByTime(1999); // one frame short of done
    expect(__mockTimerActive()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(S().jobs.at(-1)!.state).toBe('done');
    expect(__mockTimerActive()).toBe(false);
  });

  it('queueExport mints monotonically; the reset restores the counter (test determinism)', () => {
    S().queueExport({ name: 'a.mp4' });
    S().queueExport({ name: 'b.mp4' });
    expect(S().jobs.map((j) => j.id).slice(-2)).toEqual(['j-4', 'j-5']);
    reset();
    S().queueExport({ name: 'c.mp4' });
    expect(S().jobs.at(-1)!.id).toBe('j-4'); // the pristine mount always queues j-4 first
  });
});

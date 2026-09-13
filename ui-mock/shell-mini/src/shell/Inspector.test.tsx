/* R24-miniplus W1 (DESIGN-R24 D3/D4/D11): the Inspector plus-surface nets
 * — the property-editing groups (Timing/Clip) + the Effects group, the
 * additive-by-construction gate law (gate-OFF = the R23 facts surface),
 * the field→action wiring (dB map, percent, the command routing). */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { useMini } from '../state/useMini';

const S = () => useMini.getState();
const setStore = (fn: () => void) => act(fn);

function renderApp() {
  return render(<App />);
}

function selectC1() {
  setStore(() => {
    S().select('c1');
  });
}

describe('R24 W1: the additive-by-construction gate law', () => {
  beforeEach(() => {
    setStore(() => {
      S().reset();
    });
  });

  it('gate ON: a selected clip renders the plus groups (new testids, the R23 facts stay)', () => {
    renderApp();
    selectC1();
    expect(screen.getByTestId('mini-group-timing')).toBeInTheDocument();
    expect(screen.getByTestId('mini-group-clip')).toBeInTheDocument();
    expect(screen.getByTestId('mini-group-effects')).toBeInTheDocument();
    // the R23 facts surface is UNTOUCHED (the additive law)
    expect(screen.getByTestId('mini-inspector-name')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector-start')).toBeInTheDocument();
    expect(screen.getByTestId('mini-btn-nudge-left')).toBeInTheDocument();
  });

  it('gate OFF: the plus groups unmount; the R23 facts surface is byte-identical', () => {
    renderApp();
    selectC1();
    setStore(() => {
      useMini.setState({ miniPlus: false });
    });
    expect(screen.queryByTestId('mini-group-timing')).toBeNull();
    expect(screen.queryByTestId('mini-group-clip')).toBeNull();
    expect(screen.queryByTestId('mini-group-effects')).toBeNull();
    // the R23 surface: still all here
    expect(screen.getByTestId('mini-inspector-name')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector-start')).toBeInTheDocument();
    expect(screen.getByTestId('mini-btn-nudge-left')).toBeInTheDocument();
  });

  it('no selection: the plus groups render nothing (the empty card keeps its law)', () => {
    renderApp();
    expect(screen.getByTestId('mini-inspector-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-group-timing')).toBeNull();
  });
});

describe('R24 W1: the Timing group (command routing)', () => {
  beforeEach(() => {
    setStore(() => {
      S().reset();
      S().select('c1');
    });
  });

  it('the Start field commits through moveClip (a valid move lands)', () => {
    renderApp();
    const field = screen.getByTestId('mini-field-start');
    fireEvent.change(field, { target: { value: '1' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(1);
    expect(S().past.length).toBe(1);
  });

  it('a CONFLICTING Start (moveClip rejects) leaves the doc untouched and the field reverts', () => {
    renderApp();
    // c1 [0,3.5], c2 [4.5,8]: a 3s start overlaps c2? no — 3+3.5=6.5 > 4.5 → reject
    const field = screen.getByTestId('mini-field-start');
    fireEvent.change(field, { target: { value: '3' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0); // rejected
    expect(S().past.length).toBe(0); // no phantom entry
    // the toast carries the rejection
    expect(S().toast?.text).toMatch(/overlap|conflict/i);
  });

  it('the Duration field commits through trimClip (the end edge)', () => {
    renderApp();
    const field = screen.getByTestId('mini-field-duration');
    fireEvent.change(field, { target: { value: '2' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    const c = S().doc.clips.find((x) => x.id === 'c1')!;
    expect(c.duration).toBe(2);
    expect(c.start).toBe(0);
  });
});

describe('R24 W1: the Clip props group (the dB map + percent laws)', () => {
  beforeEach(() => {
    setStore(() => {
      S().reset();
    });
  });

  it('an AUDIO clip shows Volume (dB); a VIDEO clip shows Opacity — kind routing', () => {
    renderApp();
    setStore(() => {
      S().select('c4');
    }); // audio
    expect(screen.getByTestId('mini-field-volume')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-field-opacity')).toBeNull();
    setStore(() => {
      S().select('c1');
    }); // video
    expect(screen.getByTestId('mini-field-opacity')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-field-volume')).toBeNull();
  });

  it('Volume commits dB → linear through the ONE map', () => {
    renderApp();
    setStore(() => {
      S().select('c4');
    });
    const field = screen.getByTestId('mini-field-volume');
    fireEvent.change(field, { target: { value: '-6' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    const v = S().doc.clips.find((c) => c.id === 'c4')!.volume;
    expect(v).toBeCloseTo(Math.pow(10, -6 / 20), 5);
    expect(S().past.length).toBe(1);
  });

  it('Volume reset-to-unity (0 dB) DELETES the field (absent-is-default)', () => {
    renderApp();
    setStore(() => {
      S().select('c4');
    });
    // first write a non-unity value
    act(() => {
      S().setClipProp('c4', { volume: 0.5 });
    });
    expect(S().doc.clips.find((c) => c.id === 'c4')!.volume).toBe(0.5);
    // then reset via the field's double-click (resetTo=0 dB)
    fireEvent.doubleClick(screen.getByTestId('mini-field-volume'));
    expect(S().doc.clips.find((c) => c.id === 'c4')!.volume).toBeUndefined();
  });

  it('Opacity commits percent → linear [0,1]', () => {
    renderApp();
    selectC1();
    const field = screen.getByTestId('mini-field-opacity');
    fireEvent.change(field, { target: { value: '50' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(S().doc.clips.find((c) => c.id === 'c1')!.opacity).toBe(0.5);
  });

  it('Speed recomputes the duration grid-quantized and records the rate', () => {
    renderApp();
    selectC1();
    const field = screen.getByTestId('mini-field-speed');
    fireEvent.change(field, { target: { value: '200' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    const c = S().doc.clips.find((x) => x.id === 'c1')!;
    expect(c.speed).toBe(2);
    // window 3.5 / rate 2 = 1.75 → quantized to 1.5 or 2 (the 0.5 law)
    expect(c.duration % 0.5).toBe(0);
    expect(Math.abs(c.duration - 1.75)).toBe(0.25); // one of the two grid neighbors
  });

  it('the In-point field only renders when the media window has slack', () => {
    renderApp();
    // c1: 3.5 of 4.5 media → slack 1.0 → field present
    selectC1();
    expect(screen.getByTestId('mini-field-inpoint')).toBeInTheDocument();
    // c4: 7 of 7 media → no slack → absent
    setStore(() => {
      S().select('c4');
    });
    expect(screen.queryByTestId('mini-field-inpoint')).toBeNull();
  });
});

describe('R24 W1: the Effects group (the stack laws)', () => {
  beforeEach(() => {
    setStore(() => {
      S().reset();
      S().select('c1');
    });
  });

  it('the add-picker lists only defs not on the clip; picking adds the seeded effect', () => {
    renderApp();
    const select = screen.getByTestId('mini-fx-add') as HTMLSelectElement;
    expect(select.value).toBe('');
    fireEvent.change(select, { target: { value: 'fx-blur' } });
    const fx = S().doc.clips.find((c) => c.id === 'c1')!.effects!;
    expect(fx).toHaveLength(1);
    expect(fx[0]).toEqual({ id: 'fx-blur', name: 'Gaussian Blur', enabled: true, params: { radius: 4 } });
    expect(S().past.length).toBe(1);
    // the picker resets to the placeholder (one pick = one add)
    expect((screen.getByTestId('mini-fx-add') as HTMLSelectElement).value).toBe('');
    // the def left the available list
    const opts = Array.from((screen.getByTestId('mini-fx-add') as HTMLSelectElement).options).map((o) => o.value);
    expect(opts).not.toContain('fx-blur');
  });

  it('toggle → remove → the last remove DELETES the field (absent = legacy)', () => {
    renderApp();
    act(() => {
      S().addEffect('c1', 'fx-glow');
    });
    fireEvent.click(screen.getByTestId('mini-fx-enabled-fx-glow'));
    expect(S().doc.clips.find((c) => c.id === 'c1')!.effects![0].enabled).toBe(false);
    fireEvent.click(screen.getByTestId('mini-fx-remove-fx-glow'));
    expect(S().doc.clips.find((c) => c.id === 'c1')!.effects).toBeUndefined();
  });

  it('the param row commits through setEffectParam (clamped to the def bounds)', () => {
    renderApp();
    act(() => {
      S().addEffect('c1', 'fx-blur');
    });
    fireEvent.click(screen.getByTestId('mini-fx-toggle-fx-blur')); // expand the row
    const slider = screen.getByTestId('mini-fx-param-fx-blur-radius');
    fireEvent.change(slider, { target: { value: '120' } }); // > max 100
    fireEvent.pointerUp(slider);
    expect(S().doc.clips.find((c) => c.id === 'c1')!.effects![0].params!.radius).toBe(100);
  });

  it('reorder moves the effect and bounds-refuses at the edges', () => {
    renderApp();
    act(() => {
      S().addEffect('c1', 'fx-blur');
      S().addEffect('c1', 'fx-glow');
    });
    const order = () => S().doc.clips.find((c) => c.id === 'c1')!.effects!.map((e) => e.id);
    expect(order()).toEqual(['fx-blur', 'fx-glow']);
    act(() => {
      S().reorderEffect('c1', 'fx-blur', -1); // at index 0 → refuse
    });
    expect(order()).toEqual(['fx-blur', 'fx-glow']);
    act(() => {
      S().reorderEffect('c1', 'fx-glow', -1);
    });
    expect(order()).toEqual(['fx-glow', 'fx-blur']);
  });
});

describe('R24 W1: the F1 discriminating net (nested undo round-trip)', () => {
  beforeEach(() => {
    setStore(() => {
      S().reset();
      S().select('c1');
    });
  });

  it('effect param edit → undo restores the PRE-EDIT param + the doc is un-aliased', () => {
    act(() => {
      S().addEffect('c1', 'fx-blur');
    });
    const before = S().doc.clips.find((c) => c.id === 'c1')!.effects![0].params!.radius;
    expect(before).toBe(4);
    act(() => {
      S().setEffectParam('c1', 'fx-blur', 'radius', 80);
    });
    expect(S().doc.clips.find((c) => c.id === 'c1')!.effects![0].params!.radius).toBe(80);
    // the history entry does NOT alias the live params object
    const liveParams = S().doc.clips.find((c) => c.id === 'c1')!.effects![0].params;
    const pastParams = S().past.at(-1)!.clips.find((c) => c.id === 'c1')!.effects![0].params;
    expect(liveParams).not.toBe(pastParams);
    act(() => {
      S().undo();
    });
    expect(S().doc.clips.find((c) => c.id === 'c1')!.effects![0].params!.radius).toBe(4);
  });

  it('a no-op param write (same value) pushes NO history entry', () => {
    act(() => {
      S().addEffect('c1', 'fx-blur');
    });
    const pastLen = S().past.length;
    act(() => {
      S().setEffectParam('c1', 'fx-blur', 'radius', 4); // same as seeded
    });
    expect(S().past.length).toBe(pastLen);
  });
});

describe('R24 W1: audioDb (the ONE map)', () => {
  it('the coherent pair: linear [0,2] ↔ dB [−18,+6], 0 dB = unity', async () => {
    const { volToDb, dbToVol, DB_MIN, DB_MAX } = await import('../lib/audioDb');
    expect(volToDb(1)).toBe(0);
    expect(volToDb(0)).toBeLessThanOrEqual(DB_MIN);
    expect(volToDb(2)).toBe(DB_MAX); // 6.02 clamps to the pair's max
    expect(volToDb(5)).toBe(DB_MAX); // clamped
    expect(dbToVol(0)).toBe(1);
    expect(dbToVol(-18)).toBeCloseTo(0.126, 3);
    expect(dbToVol(12)).toBeCloseTo(1.995, 2); // clamped to the pair
    expect(dbToVol(volToDb(0.7))).toBeCloseTo(0.7, 5);
  });
});

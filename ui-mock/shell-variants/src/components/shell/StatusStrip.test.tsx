/* StatusStrip — spec 18 §3.1/§6.3: the 12px strip's autosave state machine
   (saved → Saving… → Saved / Save failed — retry) driven by doc mutations and
   the simulated failure flag (retry = explicit re-run), plus the selection,
   duration and zoom readouts. Real timers: the mock save write is a real
   600 ms timer. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StatusStrip } from './StatusStrip';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();
const save = () => screen.getByTestId('shell-status-save');

describe('StatusStrip (spec 18 §6.3 autosave)', () => {
  it('boot: saved state + live readouts (1 clip, 30 s, 46 px/s)', () => {
    render(<StatusStrip />);
    expect(save()).toHaveTextContent('Saved just now'); // first paint skips the save cycle
    expect(screen.getByText('1 clip selected')).toBeInTheDocument();
    expect(screen.getByText('00:00:30:00')).toBeInTheDocument(); // sceneDuration(sc-1)
    expect(screen.getByText('46 px/s')).toBeInTheDocument();
    expect(screen.getByText('OPFS · local')).toBeInTheDocument();
  });

  it('a doc mutation runs Saving… → Saved (600 ms mock write)', async () => {
    render(<StatusStrip />);
    act(() => { S().addMarker(21); }); // any scenes change starts the cycle
    expect(save()).toHaveTextContent('Saving…');
    await waitFor(() => expect(save()).toHaveTextContent(/^Saved/), { timeout: 2000 });
  });

  it('simulated failure → the retry button; retry succeeds and bumps saveAttempt', async () => {
    useUi.setState({ simulateSaveFail: true });
    render(<StatusStrip />);
    act(() => { S().addMarker(21); });
    await waitFor(() => expect(save()).toHaveTextContent('Save failed'), { timeout: 2000 });
    expect(save().tagName).toBe('BUTTON'); // the failed state IS the retry affordance
    expect(save()).toHaveAttribute('aria-label', 'Save failed — retry');
    fireEvent.click(save());
    expect(S().saveAttempt).toBe(1);
    expect(S().simulateSaveFail).toBe(false);
    await waitFor(() => expect(save()).toHaveTextContent(/^Saved/), { timeout: 2000 });
  });

  it('selection readout follows the store (aria-live)', () => {
    render(<StatusStrip />);
    act(() => { useUi.setState({ selection: [] }); });
    expect(screen.getByText('no selection')).toBeInTheDocument();
    act(() => { useUi.setState({ selection: ['el-1', 'el-2'] }); });
    expect(screen.getByText('2 clips selected')).toBeInTheDocument();
  });

  it('zoom readout reflects pxPerSec', () => {
    render(<StatusStrip />);
    act(() => { S().setZoom(100); });
    expect(screen.getByText('100 px/s')).toBeInTheDocument();
  });
});

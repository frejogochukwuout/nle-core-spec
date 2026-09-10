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
/* R23-FIX (review-sweep R1-P3): the failed state's retry BUTTON is now a
   CHILD of the persistent role=status chip (the old testid-on-button
   shape died with the live-region restructure — re-pinned honestly). */
const retry = () => screen.getByRole('button', { name: 'Save failed — click to retry save' });

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
    /* R23-FIX (R1-P3): the chip is ONE persistent role=status live region —
       the saving→saved flip is a CONTENT change on the SAME element, so
       polite announcement is possible (the old three siblings each
       unmounted, which no live region can announce). */
    expect(save()).toHaveAttribute('role', 'status');
    await waitFor(() => expect(save()).toHaveTextContent(/^Saved/), { timeout: 2000 });
    expect(save()).toHaveAttribute('role', 'status'); // the same element survived the flip
  });

  /* R23-FIX (review-sweep item 10, R1-P2-1): style-level pin — the save chip
     and every readout span carry leading-[12px] (line-height inherits, so
     the 11px children's line box fits the 12px band; the aria-hidden 5px
     dots have no line box to hold). */
  it('R23-FIX item 10: the strip\'s children carry leading-[12px] — the 12px band holds its line box', () => {
    render(<StatusStrip />);
    expect(save().className).toContain('leading-[12px]');
    expect(screen.getByText('46 px/s').className).toContain('leading-[12px]');
    expect(screen.getByText('OPFS · local').className).toContain('leading-[12px]');
    expect(screen.getByText('1 clip selected').className).toContain('leading-[12px]');
    expect(screen.getByText('00:00:30:00').className).toContain('leading-[12px]');
  });

  it('simulated failure → the retry button (inside the status chip); retry succeeds and bumps saveAttempt', async () => {
    useUi.setState({ simulateSaveFail: true });
    render(<StatusStrip />);
    act(() => { S().addMarker(21); });
    await waitFor(() => expect(save()).toHaveTextContent('Save failed'), { timeout: 2000 });
    /* R23-FIX (R1-P3 re-pin): the chip STAYS the role=status span; the
       failed state renders the retry button as its child (label-in-name:
       the aria-label carries the visible text + the action). */
    expect(save().tagName).toBe('SPAN');
    expect(save()).toHaveAttribute('role', 'status');
    expect(retry()).toBeInTheDocument();
    expect(retry()).toHaveAccessibleName('Save failed — click to retry save');
    fireEvent.click(retry());
    expect(S().saveAttempt).toBe(1);
    expect(S().simulateSaveFail).toBe(false);
    await waitFor(() => expect(save()).toHaveTextContent(/^Saved/), { timeout: 2000 });
  });

  /* R23-FIX (review-sweep item 12, R1-P2-3): the retry control's text rides
     the --danger-text TINT (deviation-registered lighter fork for AA);
     style-level pin — jsdom cannot compute contrast. */
  it('R23-FIX item 12: the failed retry text uses the --danger-text tint (the AA text fork), not raw --danger', async () => {
    useUi.setState({ simulateSaveFail: true });
    render(<StatusStrip />);
    act(() => { S().addMarker(21); });
    await waitFor(() => expect(save()).toHaveTextContent('Save failed'), { timeout: 2000 });
    expect(retry().className).toContain('text-[var(--danger-text)]');
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

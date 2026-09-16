/* R24-miniplus W0 (DESIGN-R24 D3/D11): the field-primitive laws — ported
 * from the variants' Inspector, netted here BEFORE the first consumer
 * (W1's Inspector sections) so the laws are pinned at the source. The
 * NumberField contract is the crown jewel: Enter/blur-settle/Escape/
 * invalid/double-click semantics, ONE commit per settle (the 50ms
 * debounce is DROPPED for the mini — deviation #16), NOTHING dispatched
 * while invalid, and the display rewrites to the committed snapped
 * value (the F3 law). */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberField, ParamRow, Group, parseNum } from './fields';

describe('parseNum (the one parse law)', () => {
  it('accepts decimals, whitespace, negatives; rejects text and empty', () => {
    expect(parseNum('1.5')).toBe(1.5);
    expect(parseNum(' 2 ')).toBe(2);
    expect(parseNum('-0.5')).toBe(-0.5);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
  });
});

describe('R24 NumberField (the commit law family)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (value = 2, min = 0, max = 10) => {
    const onCommit = vi.fn();
    render(<NumberField label="Start" value={value} min={min} max={max} step={0.5} resetTo={1} testid="nf" onCommit={onCommit} />);
    return onCommit;
  };
  const input = () => screen.getByTestId('nf');

  it('commits a valid edit ONCE on Enter', () => {
    const onCommit = setup();
    fireEvent.change(input(), { target: { value: '3.5' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(3.5);
  });

  it('Enter-invalid: the error shows, focus stays, NOTHING is dispatched', () => {
    const onCommit = setup();
    fireEvent.change(input(), { target: { value: '99' } }); // > max 10
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('nf-err')).toBeInTheDocument();
    expect(screen.getByTestId('nf-err')).toHaveTextContent(/10/);
    // typing clears the stale error
    fireEvent.change(input(), { target: { value: '4' } });
    expect(screen.queryByTestId('nf-err')).toBeNull();
  });

  it('blur-invalid reverts the display; nothing was ever dispatched', () => {
    const onCommit = setup(2);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '99' } });
    fireEvent.blur(input());
    expect(onCommit).not.toHaveBeenCalled();
    expect(input()).toHaveValue('2');
  });

  it('unparseable input is the invalid state (Enter keeps the error)', () => {
    const onCommit = setup();
    fireEvent.change(input(), { target: { value: 'abc' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('nf-err')).toBeInTheDocument();
  });

  it('Escape reverts the display without dispatching', () => {
    const onCommit = setup(2);
    fireEvent.change(input(), { target: { value: '5' } });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input()).toHaveValue('2');
  });

  it('double-click resets to the default THROUGH the commit path', () => {
    const onCommit = setup(2);
    fireEvent.doubleClick(input());
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1); // resetTo
  });

  it('an unchanged re-entry of the same value commits nothing', () => {
    const onCommit = setup(2);
    fireEvent.change(input(), { target: { value: '2' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('the step snaps the committed value (0.5 grid)', () => {
    const onCommit = setup(2);
    fireEvent.change(input(), { target: { value: '3.3' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(3.5); // snapped to the 0.5 grid
  });

  it('F3: after a snapped commit the display shows the SNAPPED value (never the typed text)', () => {
    const onCommit = setup(2);
    fireEvent.change(input(), { target: { value: '3.3' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(3.5);
    expect(input()).toHaveValue('3.5'); // the committed truth, not "3.3"
  });

  it('F13: the snapped value re-clamps to the field bounds (an off-grid max)', () => {
    const onCommit = setup(2, 0, 1.8); // max 1.8, step 0.5
    fireEvent.change(input(), { target: { value: '1.7' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(1.5); // snapped down, not 2.0 past max
  });

  it('external value changes resync the display while unfocused', () => {
    const onCommit = vi.fn();
    const { rerender } = render(<NumberField label="Dur" value={2} min={0} max={10} testid="nf" onCommit={onCommit} />);
    // rerender flushes effects inside act — assert synchronously (fake
    // timers make waitFor's polling loop never advance)
    rerender(<NumberField label="Dur" value={4} min={0} max={10} testid="nf" onCommit={onCommit} />);
    expect(screen.getByTestId('nf')).toHaveValue('4');
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('R24 ParamRow (the slider law)', () => {
  it('drag previews locally, ONE commit on release', () => {
    const onCommit = vi.fn();
    render(<ParamRow label="Opacity" value={50} min={0} max={100} step={1} testid="pr" onCommit={onCommit} />);
    const slider = screen.getByTestId('pr');
    fireEvent.change(slider, { target: { value: '70' } });
    // mid-drag: the value badge shows the preview, no commit yet
    expect(screen.getByTestId('pr-value')).toHaveTextContent('70');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(70);
  });

  it('double-click resets through the commit path', () => {
    const onCommit = vi.fn();
    render(<ParamRow label="Opacity" value={50} min={0} max={100} step={1} resetTo={100} testid="pr" onCommit={onCommit} />);
    fireEvent.doubleClick(screen.getByTestId('pr'));
    expect(onCommit).toHaveBeenCalledWith(100);
  });
});

describe('R24 Group (the collapse law)', () => {
  it('the body stays in DOM via hidden (never unmounted)', () => {
    render(
      <Group title="Timing" testid="grp">
        <div data-testid="grp-child">x</div>
      </Group>,
    );
    expect(screen.getByTestId('grp-child')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('grp-toggle'));
    expect(screen.getByTestId('grp-child')).toBeInTheDocument(); // still mounted
    expect(screen.getByTestId('grp-toggle')).toHaveAttribute('aria-expanded', 'false');
  });
});

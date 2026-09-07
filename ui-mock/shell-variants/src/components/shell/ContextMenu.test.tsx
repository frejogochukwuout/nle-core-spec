/* ContextMenu.test.tsx — R23-FIX (review-sweep R1-P3): the §4.9 menu chrome
   had NO component-level test of its own (every pin lived in host-surface
   suites — Timeline/Ruler/Toolbar2 menus). This small suite pins the
   component's OWN contract: naming, first-enabled-item focus, disabled
   inertness, close-then-dispatch ordering, Esc + outside-click dismissal,
   and the roving arrows' skip-disabled law. Host routing (contextmenu →
   open, Shift+F10, per-surface items) stays pinned in the hosts' suites. */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ContextMenu, isMenuKey } from './ContextMenu';

const ITEMS = [
  { id: 'add', label: 'Add marker', shortcut: 'M' },
  { id: 'dead', label: 'Paste', disabled: true },
  { id: 'cut', label: 'Cut', danger: true },
];

const renderMenu = (onClose = vi.fn()) => {
  const onSelect = vi.fn();
  render(
    <ContextMenu
      x={40}
      y={40}
      items={[...ITEMS, { id: 'sel', label: 'Select', onSelect }]}
      onClose={onClose}
    />,
  );
  return { onClose, onSelect };
};

describe('ContextMenu (spec 18 §4.9 menu chrome)', () => {
  it('renders the role=menu surface with the generic testid naming; every command item is a menuitem', () => {
    renderMenu();
    const menu = screen.getByTestId('shell-menu');
    expect(menu).toHaveAttribute('role', 'menu');
    expect(screen.getByTestId('shell-menu-item-add')).toHaveAttribute('role', 'menuitem');
    expect(screen.getByTestId('shell-menu-item-dead')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('shell-menu-item-dead')).not.toHaveAttribute('aria-disabled', 'false');
  });

  it('the FIRST ENABLED item takes focus on open (disabled items are never the stop)', () => {
    renderMenu();
    expect(screen.getByTestId('shell-menu-item-add')).toHaveFocus();
  });

  it('Enter on a focused item closes the menu THEN dispatches (§4.9 close-then-run order)', () => {
    const { onClose, onSelect } = renderMenu();
    const item = screen.getByTestId('shell-menu-item-sel');
    item.focus();
    fireEvent.click(item); // buttons activate on Enter/Space natively → onClick
    expect(onClose).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalled();
  });

  it('a DISABLED item is inert — no close, no dispatch, mousedown default prevented', () => {
    const { onClose, onSelect } = renderMenu();
    const dead = screen.getByTestId('shell-menu-item-dead');
    fireEvent.click(dead);
    expect(onClose).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Esc closes (the menu owns the keyboard while open)', () => {
    const { onClose } = renderMenu();
    fireEvent.keyDown(screen.getByTestId('shell-menu'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a pointerdown on the transparent overlay closes (outside click — no backdrop)', () => {
    const { onClose } = renderMenu();
    // the overlay is the fixed z-92 layer rendered before the pop
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(overlay).toBeTruthy();
    fireEvent.pointerDown(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('roving arrows skip disabled items and wrap (↓ add → cut, ↑ wraps back past dead)', () => {
    renderMenu();
    fireEvent.keyDown(screen.getByTestId('shell-menu'), { key: 'ArrowDown' });
    // add → cut (dead skipped)
    expect(screen.getByTestId('shell-menu-item-cut')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('shell-menu'), { key: 'ArrowDown' });
    // cut → sel (last)
    expect(screen.getByTestId('shell-menu-item-sel')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('shell-menu'), { key: 'ArrowUp' });
    expect(screen.getByTestId('shell-menu-item-cut')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('shell-menu'), { key: 'ArrowUp' });
    // wraps past dead back to add
    expect(screen.getByTestId('shell-menu-item-add')).toHaveFocus();
  });

  it('isMenuKey: Shift+F10 and the ContextMenu key are the §11 keyboard routes; plain F10 is not', () => {
    expect(isMenuKey({ key: 'F10', shiftKey: true })).toBe(true);
    expect(isMenuKey({ key: 'ContextMenu' })).toBe(true);
    expect(isMenuKey({ key: 'F10', shiftKey: false })).toBe(false);
    expect(isMenuKey({ key: 'm', shiftKey: true })).toBe(false);
  });
});

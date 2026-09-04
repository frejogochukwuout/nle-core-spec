/* VariantProvider — the debug-variant context: default boot, persistence
   (localStorage + #v= hash mirror), ctrl+` / cmd+` overlay toggle, Esc close,
   and the useVariant() provider guard. setup.ts wipes the LS keys + hash +
   data-attrs after every test, so persistence mutations stay contained. */

import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { VariantProvider, useVariant } from './VariantProvider';
import { DEFAULT_VARIANT, PRESETS, serializeVariant } from '../../lib/variants';
import { pressKey } from '../../test/helpers';

/** Reads the context into the DOM + lets tests drive setVariant. */
function Probe() {
  const { variant, setVariant, overlayOpen, setOverlayOpen } = useVariant();
  return (
    <div>
      <span data-testid="probe-theme">{variant.theme}</span>
      <span data-testid="probe-accent">{variant.accent}</span>
      <span data-testid="probe-overlay">{overlayOpen ? 'open' : 'closed'}</span>
      <button onClick={() => setVariant(PRESETS[1].variant)}>apply-preset-b</button>
      <button onClick={() => setOverlayOpen(true)}>open-overlay</button>
    </div>
  );
}

const shellAttrs = (container: HTMLElement) => container.querySelector('[data-variant]') as HTMLElement;

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
});

describe('VariantProvider boot (URL hash > localStorage > default)', () => {
  it('boots the spec-canonical default and applies the variant data-attributes', () => {
    const { container } = render(<VariantProvider><Probe /></VariantProvider>);
    const root = shellAttrs(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-variant', serializeVariant(DEFAULT_VARIANT));
    expect(root).toHaveAttribute('data-theme', 'resolve');
    expect(root).toHaveAttribute('data-density', 'pro');
    expect(root).toHaveAttribute('data-clipstyle', 'filmstrip');
    expect(root).toHaveAttribute('data-accent', 'gold');
    expect(root).toHaveAttribute('data-headerstyle', 'readout');
    expect(screen.getByTestId('probe-theme')).toHaveTextContent('resolve');
  });

  it('boots from localStorage when no hash is set (persistence survives reload)', () => {
    window.localStorage.setItem('nle-shell-variants:v1', serializeVariant(PRESETS[1].variant));
    const { container } = render(<VariantProvider><Probe /></VariantProvider>);
    expect(shellAttrs(container)).toHaveAttribute('data-theme', 'studio');
    expect(screen.getByTestId('probe-accent')).toHaveTextContent('violet');
  });

  it('the #v= share hash wins over localStorage', () => {
    window.localStorage.setItem('nle-shell-variants:v1', serializeVariant(PRESETS[1].variant));
    window.location.hash = `v=${serializeVariant(PRESETS[2].variant)}`;
    const { container } = render(<VariantProvider><Probe /></VariantProvider>);
    expect(shellAttrs(container)).toHaveAttribute('data-theme', 'light');
    expect(screen.getByTestId('probe-theme')).toHaveTextContent('light');
  });
});

describe('setVariant persistence', () => {
  it('persists to localStorage AND mirrors into the hash, re-skinning the shell root', async () => {
    const { container } = render(<VariantProvider><Probe /></VariantProvider>);
    await act(async () => {
      screen.getByText('apply-preset-b').click();
    });
    expect(window.localStorage.getItem('nle-shell-variants:v1')).toBe(serializeVariant(PRESETS[1].variant));
    expect(window.location.hash).toContain(`v=${encodeURIComponent(serializeVariant(PRESETS[1].variant))}`);
    expect(shellAttrs(container)).toHaveAttribute('data-theme', 'studio');
    expect(screen.getByTestId('probe-theme')).toHaveTextContent('studio');
  });
});

describe('debug-overlay key binding (ctrl+` / cmd+`, Esc closes)', () => {
  it('ctrl+` toggles overlayOpen and Esc closes it again', () => {
    render(<VariantProvider><Probe /></VariantProvider>);
    expect(screen.getByTestId('probe-overlay')).toHaveTextContent('closed');
    act(() => { pressKey({ key: '`', ctrlKey: true }); });
    expect(screen.getByTestId('probe-overlay')).toHaveTextContent('open');
    act(() => { pressKey({ key: 'Escape' }); });
    expect(screen.getByTestId('probe-overlay')).toHaveTextContent('closed');
  });

  it('cmd+` (macOS chord) toggles too; a bare ` without modifier does not', () => {
    render(<VariantProvider><Probe /></VariantProvider>);
    act(() => { pressKey({ key: '`', metaKey: true }); });
    expect(screen.getByTestId('probe-overlay')).toHaveTextContent('open');
    act(() => { pressKey({ key: '`', metaKey: true }); });
    expect(screen.getByTestId('probe-overlay')).toHaveTextContent('closed');
    act(() => { pressKey({ key: '`' }); }); // no modifier — inert
    expect(screen.getByTestId('probe-overlay')).toHaveTextContent('closed');
  });
});

describe('useVariant provider guard', () => {
  it('throws when called outside <VariantProvider>', () => {
    function Bare() { useVariant(); return null; }
    expect(() => render(<Bare />)).toThrow('useVariant outside VariantProvider');
  });
});

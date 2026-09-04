/* DebugOverlay — the ctrl+` Variant Explorer. Pill ↔ dialog swap, preset
   A/B/C application (re-skins the VariantProvider root via data-attrs),
   independent dimension segments, the §6.4 toast-test driver buttons, the
   share-link copy feedback, and the reset-to-canon action. Rendered through
   renderShell (needs VariantProvider + the store). */

import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugOverlay } from './DebugOverlay';
import { DEFAULT_VARIANT, serializeVariant } from '../../lib/variants';
import { renderShell, store } from '../../test/helpers';

const shellRoot = (container: HTMLElement) => container.querySelector('[data-variant]') as HTMLElement;

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
});

describe('DebugOverlay open/close states', () => {
  it('closed: renders only the corner pill, no dialog', () => {
    renderShell(<DebugOverlay />);
    expect(screen.getByRole('button', { name: 'Open variant explorer' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Variant explorer' })).not.toBeInTheDocument();
  });

  it('pill click opens the explorer dialog; the header X closes it', async () => {
    const user = userEvent.setup();
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    expect(screen.getByRole('dialog', { name: 'Variant explorer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close variant explorer' }));
    expect(screen.queryByRole('dialog', { name: 'Variant explorer' })).not.toBeInTheDocument();
  });
});

describe('direction presets (A/B/C)', () => {
  it('renders the three curated directions', async () => {
    const user = userEvent.setup();
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    for (const name of ['Resolve Classic', 'Modern Studio', 'Editorial Light']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('applying preset B re-skins the shell root and persists it', async () => {
    const user = userEvent.setup();
    const { container } = renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: /Modern Studio/ }));
    expect(shellRoot(container)).toHaveAttribute('data-theme', 'studio');
    expect(shellRoot(container)).toHaveAttribute('data-accent', 'violet');
    expect(shellRoot(container)).toHaveAttribute('data-density', 'comfortable');
    // choice persists (the share-link contract, §8 debug tooling)
    expect(window.localStorage.getItem('nle-shell-variants:v1')).toContain('theme:studio');
  });
});

describe('dimension segments (independent of presets)', () => {
  it('Theme segment switches resolve → studio without touching the other dimensions', async () => {
    const user = userEvent.setup();
    const { container } = renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    // segmented controls expose the selected segment via aria-pressed (R13 fix)
    expect(screen.getByRole('button', { name: 'Resolve' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Studio' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Studio' })); // seg button (name is exact-matched)
    expect(shellRoot(container)).toHaveAttribute('data-theme', 'studio');
    expect(shellRoot(container)).toHaveAttribute('data-accent', 'gold'); // untouched
    expect(screen.getByRole('button', { name: 'Studio' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Resolve' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Accent segment swaps the accent token (ember)', async () => {
    const user = userEvent.setup();
    const { container } = renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: 'Ember' }));
    expect(shellRoot(container)).toHaveAttribute('data-accent', 'ember');
  });

  it('Reset restores the spec-canonical default variant', async () => {
    const user = userEvent.setup();
    const { container } = renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: /Editorial Light/ })); // off-canon first
    expect(shellRoot(container)).toHaveAttribute('data-theme', 'light');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(shellRoot(container)).toHaveAttribute('data-variant', serializeVariant(DEFAULT_VARIANT));
  });
});

describe('toast-test driver (spec 18 §6.4)', () => {
  it('the error/info/success buttons push matching toasts into the store region', async () => {
    const user = userEvent.setup();
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByTestId('debug-btn-toast-error'));
    await user.click(screen.getByTestId('debug-btn-toast-info'));
    await user.click(screen.getByTestId('debug-btn-toast-success'));
    const titles = store().toasts.map((t) => `${t.kind}:${t.title}`);
    expect(titles).toContain('error:Error toast');
    expect(titles).toContain('info:Info toast');
    expect(titles).toContain('success:Success toast');
  });
});

describe('share link', () => {
  it('Copy share link flips to the copied confirmation', async () => {
    const user = userEvent.setup();
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    await waitFor(() => expect(screen.getByText('Link copied')).toBeInTheDocument());
  });
});

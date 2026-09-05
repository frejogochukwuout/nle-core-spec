/* DebugOverlay — the ctrl+` Variant Explorer. Pill ↔ dialog swap, preset
   A/B/C application (re-skins the VariantProvider root via data-attrs),
   independent dimension segments, the §6.4 toast-test driver buttons, the
   share-link copy feedback, and the reset-to-canon action. Rendered through
   renderShell (needs VariantProvider + the store). */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugOverlay } from './DebugOverlay';
import { StatusStrip } from '../shell/StatusStrip';
import { DEFAULT_VARIANT, serializeVariant } from '../../lib/variants';
import { renderShell, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const shellRoot = (container: HTMLElement) => container.querySelector('[data-variant]') as HTMLElement;

/** jsdom ships no navigator.clipboard — install the writeText stub the
 *  share-link path awaits (ErrorBoundary.test pattern). */
const stubClipboard = (impl: () => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(impl) }, configurable: true });
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
});

afterEach(() => {
  // drop any clipboard stub installed by a test (configurable by definition)
  delete (navigator as { clipboard?: unknown }).clipboard;
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
    // AFTER setup: user-event installs its own navigator.clipboard stub —
    // a stub defined earlier would be silently overwritten (probed)
    stubClipboard(() => Promise.resolve());
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    await waitFor(() => expect(screen.getByText('Link copied')).toBeInTheDocument());
  });

  it('a rejected write surfaces "Copy failed" inline and the button stays retryable (W1-17 fix)', async () => {
    // clipboard permission denied — the OLD code swallowed this and showed
    // a false "Link copied"; the fix must show the failure honestly
    const user = userEvent.setup();
    stubClipboard(() => Promise.reject(new Error('denied'))); // AFTER setup (it replaces navigator.clipboard)
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    await waitFor(() => expect(screen.getByText('Copy failed')).toBeInTheDocument());
    expect(screen.queryByText('Link copied')).toBeNull(); // no false success
    // retry stays enabled and can succeed once the clipboard recovers
    stubClipboard(() => Promise.resolve());
    await user.click(screen.getByRole('button', { name: 'Copy failed' }));
    await waitFor(() => expect(screen.getByText('Link copied')).toBeInTheDocument());
  });

  it('a missing clipboard API surfaces the failure too (not a false success)', async () => {
    const user = userEvent.setup();
    delete (navigator as { clipboard?: unknown }).clipboard; // jsdom default — setup re-adds its stub, so drop AFTER setup
    renderShell(<DebugOverlay />);
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    await waitFor(() => expect(screen.getByText('Copy failed')).toBeInTheDocument());
  });
});

describe('Simulate save failure drill (R14 — wires the orphaned store action)', () => {
  it('the toggle arms simulateSaveFail; a doc mutation then drives StatusStrip to the §6.4 failure row', async () => {
    const user = userEvent.setup();
    renderShell(
      <>
        <DebugOverlay />
        <StatusStrip />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Open variant explorer' }));
    const toggle = screen.getByLabelText('Simulate save failure');
    expect(store().simulateSaveFail).toBe(false);
    await user.click(toggle);
    expect(store().simulateSaveFail).toBe(true);
    expect(toggle).toBeChecked();
    // the armed drill: the next save attempt (doc mutation → 600 ms mock
    // write) lands in the failure state — the StatusStrip.test pattern
    act(() => { useUi.getState().addMarker(21); });
    await waitFor(() =>
      expect(screen.getByTestId('shell-status-save')).toHaveTextContent('Save failed'),
      { timeout: 2000 },
    );
    // un-arming the toggle restores the flag
    await user.click(toggle);
    expect(store().simulateSaveFail).toBe(false);
  });
});

/* Shared component-test helpers — the provider stack the real app mounts
   (VariantProvider → ConfirmProvider → tree) plus store boot. Component tests
   that render leaves calling useVariant()/useConfirm() must use these. */

import { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { VariantProvider } from '../components/debug/VariantProvider';
import { ConfirmProvider } from '../components/shell/ConfirmDialog';
import { useUi } from '../state/useUiStore';

/** Store patch type (same trick as stories' UiPatch — UiState is not exported). */
export type UiPatch = Partial<ReturnType<typeof useUi.getState>>;

/** Renders with the app's provider stack. `patch` boots the store before
 *  first paint (mirrors the stories' StoreBoot layout-effect contract). */
export function renderShell(ui: ReactNode, opts?: { patch?: UiPatch } & Omit<RenderOptions, 'wrapper'>) {
  const { patch, ...rest } = opts ?? {};
  if (patch) useUi.setState(patch);
  const utils = render(<VariantProvider><ConfirmProvider>{ui}</ConfirmProvider></VariantProvider>, rest);
  return utils;
}

/** Plain render (no providers) for components that never touch
 *  useVariant()/useConfirm(). */
export function renderPlain(ui: ReactNode, opts?: RenderOptions) {
  return render(ui, opts);
}

/** Fire a window-level keydown — the shape useShortcuts listens for.
 *  `code` is included because alt-combos on Mac remap `key`. */
export function pressKey(init: {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}) {
  const evt = new KeyboardEvent('keydown', {
    key: init.key,
    code: init.code ?? '',
    bubbles: true,
    cancelable: true,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    altKey: init.altKey ?? false,
    shiftKey: init.shiftKey ?? false,
  });
  window.dispatchEvent(evt);
  return evt;
}

/** Convenience store accessors for assertions. */
export const store = () => useUi.getState();

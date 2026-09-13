/* decorators — R25-F2 (E8): the FullShell story scaffold mounts the
   window-too-small guard. The old scaffold deliberately OMITTED the
   TooSmall overlay ("not meaningfully previewable as a story"), which left
   reviewers a starved shell below 1280px instead of the honest ≤1279px
   overlay the app itself shows (spec 18 §3.2). Pinned by rendering the
   scaffold with the same provider stack the global storybook decorator
   contributes (VariantProvider → ConfirmProvider → story). */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VariantProvider } from '../components/debug/VariantProvider';
import { ConfirmProvider } from '../components/shell/ConfirmDialog';
import { FullShell } from './decorators';

describe('R25-F2 (E8): FullShell carries the honest window-too-small guard', () => {
  it('the story scaffold renders the SAME TooSmall overlay markup App.tsx mounts (the ≤1279px guard is previewable, not starved)', () => {
    render(
      <VariantProvider>
        <ConfirmProvider>
          <FullShell />
        </ConfirmProvider>
      </VariantProvider>,
    );
    /* jsdom applies no CSS (vitest css: false) — the media-query gate keeps
       the overlay display:none at full size in the real browser; the pin is
       that the story mounts the guard's markup AT ALL (the omission is the
       bug). */
    const overlay = document.querySelector('.window-too-small');
    expect(overlay).not.toBeNull();
    expect(screen.getByText('Window too small')).toBeInTheDocument();
    expect(screen.getByText('The editor needs at least 1280 × 800.')).toBeInTheDocument();
    expect(screen.getByText('spec 18 §3.2 — overlay, not degradation')).toBeInTheDocument();
    // the shell itself still mounts (the scaffold is the full composition)
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
  });
});

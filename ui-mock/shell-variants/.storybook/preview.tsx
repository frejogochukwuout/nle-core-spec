/* Storybook 9 preview — the review surface for the shell-variants mockup.

   - imports the app's own stylesheet (tokens + component CSS) so stories are
     pixel-identical to the standalone build;
   - global decorators: withStoreReset (outer) + withVariantProvider (inner),
     both from src/stories/decorators.tsx (see the header comment there);
   - no globalTypes/toolbar variant switcher on purpose — variant dimensions
     are per-story (Variants.stories.tsx), which is how the review workflow
     wants them: fixed, screenshottable, linkable;
   - backgrounds disabled: the app manages its own surfaces via token
     attributes on the shell root;
   - viewport: three desktop presets (1920×1080 default, 1440×900, 1280×800
     floor) — matching spec 18 §3.2 minimum window;
   - a11y: axe runs against the story root; manual mode (default) — no
     playwright dependency needed for design review. */

import type { Preview } from '@storybook/react-vite';
import '../src/styles/app.css';
import { withStoreReset, withVariantProvider } from '../src/stories/decorators';

const preview: Preview = {
  initialGlobals: {
    viewport: { value: 'shell-1920x1080' },
  },
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        'shell-1920x1080': { name: 'Shell 1920×1080', styles: { width: '1920px', height: '1080px' }, type: 'desktop' },
        'shell-1440x900': { name: 'Shell 1440×900', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
        'shell-1280x800': { name: 'Shell 1280×800 (floor)', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
    backgrounds: { disable: true },
    a11y: {
      context: '#storybook-root',
    },
  },
  decorators: [withStoreReset, withVariantProvider],
};

export default preview;

/* Storybook preview — the mini review surface (D8).
   - imports the app's stylesheets (tokens + app + timeline + shell) so
     stories are pixel-identical to the standalone build;
   - global decorator withStoreReset: per-story switch re-hydrates the
     pristine store snapshot captured at module load (the mini has no
     localStorage keys to wipe — persistence is out of scope);
   - viewport: three desktop presets (1920×1080 default, 1440×900,
     1280×800 floor) matching DESIGN D4;
   - backgrounds disabled: the app paints its own surfaces. */

import type { Preview } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import '../src/styles/app.css';
import '../src/timeline/timeline.css';
import '../src/shell/shell.css';
import { useMini } from '../src/state/useMini';

/** Pristine state, captured at module load — before any story rendered. */
const pristine = useMini.getState();

let lastStoryId: string | undefined;

/** Reset per story-id change (render phase) AND on decorator unmount —
 *  effects fire child-first, so a mount-phase reset would wipe the story's
 *  own StoreBoot patch; the unmount cleanup instead guarantees a remount
 *  ("Play again", StrictMode double-mount) starts from pristine before
 *  the story's patch re-applies (review finding #12). */
export const withStoreReset = (Story: React.ComponentType, context: { id: string }) => {
  useLayoutEffect(() => {
    return () => {
      useMini.setState(pristine, true); // replace semantics — full re-hydration
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset once per unmount
  }, []);
  if (lastStoryId !== context.id) {
    lastStoryId = context.id;
    useMini.setState(pristine, true);
  }
  return <Story />;
};

const preview: Preview = {
  initialGlobals: {
    viewport: { value: 'mini-1920x1080' },
  },
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        'mini-1920x1080': { name: 'Mini 1920×1080', styles: { width: '1920px', height: '1080px' }, type: 'desktop' },
        'mini-1440x900': { name: 'Mini 1440×900', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
        'mini-1280x800': { name: 'Mini 1280×800 (floor)', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
    backgrounds: { disable: true },
    a11y: {
      context: '#storybook-root',
    },
  },
  decorators: [withStoreReset],
};

export default preview;

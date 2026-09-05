/* Full-shell stories (D8) — the default review surface: the whole mini
   app at each meaningful state. StoreBoot applies patches before first
   paint (mount-only; the global decorator guarantees a fresh store). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import App from '../App';
import { useMini } from '../state/useMini';

const meta: Meta = {
  title: 'Shell',
};
export default meta;

type Patch = Partial<ReturnType<typeof useMini.getState>>;

/** Applies a store patch before first paint (mount-only, no flash). */
function StoreBoot({ patch }: { patch?: Patch }) {
  useLayoutEffect(() => {
    if (patch) useMini.setState(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  }, []);
  return null;
}

function FullShell({ patch }: { patch?: Patch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <App />
    </>
  );
}

export const Default: StoryObj = {
  name: 'Shell — default (seed)',
  render: () => <FullShell />,
};

export const ZoomedIn: StoryObj = {
  name: 'Shell — zoomed in (96pps)',
  render: () => <FullShell patch={{ zoomStep: 2 }} />,
};

export const Selected: StoryObj = {
  name: 'Shell — clip selected + inspector facts',
  render: () => <FullShell patch={{ selectedId: 'c2', playhead: 5.5 }} />,
};

export const AfterSplit: StoryObj = {
  name: 'Shell — after split at 6.5s',
  render: () => <FullShell patch={{ playhead: 6.5 }} />,
  /* split via the real action so the story shows the committed doc */
  play: async () => {
    useMini.getState().select('c2');
    useMini.getState().splitAtPlayhead();
  },
};

export const EmptyTimeline: StoryObj = {
  name: 'Shell — empty timeline',
  render: () => {
    const { doc } = useMini.getState();
    return (
      <FullShell
        patch={{
          doc: { tracks: doc.tracks, media: doc.media, clips: [] },
          selectedId: null,
          playhead: 0,
        }}
      />
    );
  },
};

export const SnapOff: StoryObj = {
  name: 'Shell — snapping off',
  render: () => <FullShell patch={{ snapOn: false }} />,
};

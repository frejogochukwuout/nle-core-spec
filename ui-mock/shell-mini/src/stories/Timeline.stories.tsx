/* Timeline stories (D8) — the solo panel: default, every zoom tier,
   selected clip, audio clip focus, empty lanes, and a scrolled state
   (reviews the shared scroll wrapper + playhead alignment under scroll). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import { Timeline } from '../timeline/Timeline';
import { useMini } from '../state/useMini';

const meta: Meta = {
  title: 'Timeline',
};
export default meta;

function Boot({ patch }: { patch?: Partial<ReturnType<typeof useMini.getState>> }) {
  useLayoutEffect(() => {
    if (patch) useMini.setState(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  }, []);
  return null;
}

function Frame({ children, patch }: { children: React.ReactNode; patch?: Partial<ReturnType<typeof useMini.getState>> }) {
  return (
    <div
      style={{
        background: '#0d0d0d',
        height: '100vh',
        padding: 24,
        boxSizing: 'border-box',
        backgroundImage: 'radial-gradient(#383838 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Boot patch={patch} />
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export const Default: StoryObj = {
  name: 'Timeline — default (48pps, seed)',
  render: () => (
    <Frame>
      <Timeline />
    </Frame>
  ),
};

export const Zoom0: StoryObj = {
  name: 'Timeline — zoom 0 (24pps overview)',
  render: () => (
    <Frame patch={{ zoomStep: 0 }}>
      <Timeline />
    </Frame>
  ),
};

export const Zoom2: StoryObj = {
  name: 'Timeline — zoom 2 (96pps)',
  render: () => (
    <Frame patch={{ zoomStep: 2 }}>
      <Timeline />
    </Frame>
  ),
};

export const Zoom4: StoryObj = {
  name: 'Timeline — zoom 4 (384pps, scrollable)',
  render: () => (
    <Frame patch={{ zoomStep: 4 }}>
      <Timeline />
    </Frame>
  ),
};

export const Scrolled: StoryObj = {
  name: 'Timeline — scrolled mid-document (zoom 4)',
  render: () => (
    <Frame patch={{ zoomStep: 4, playhead: 6.25 }}>
      <Timeline />
    </Frame>
  ),
  /* scroll the shared wrapper to ~6s so ruler+lanes+playhead alignment
     under scroll is directly reviewable */
  play: async () => {
    const scroller = document.querySelector('[data-testid="mini-timeline-scroll"]') as HTMLElement | null;
    if (scroller) scroller.scrollLeft = 6.25 * 384;
  },
};

export const ClipSelected: StoryObj = {
  name: 'Timeline — clip selected (selection ring)',
  render: () => (
    <Frame patch={{ selectedId: 'c2' }}>
      <Timeline />
    </Frame>
  ),
};

export const AudioFocus: StoryObj = {
  name: 'Timeline — audio clip selected (waveform body)',
  render: () => (
    <Frame patch={{ selectedId: 'c4', playhead: 4 }}>
      <Timeline />
    </Frame>
  ),
};

export const PlayheadMid: StoryObj = {
  name: 'Timeline — playhead mid-doc (time pill on hover)',
  render: () => (
    <Frame patch={{ playhead: 5.25 }}>
      <Timeline />
    </Frame>
  ),
};

export const EmptyLanes: StoryObj = {
  name: 'Timeline — empty lanes',
  render: () => {
    const { doc } = useMini.getState();
    return (
      <Frame
        patch={{
          doc: { tracks: doc.tracks, media: doc.media, clips: [] },
          selectedId: null,
          playhead: 0,
        }}
      >
        <Timeline />
      </Frame>
    );
  },
};

export const SnapOffState: StoryObj = {
  name: 'Timeline — snap toggle off (magnet icon inactive)',
  render: () => (
    <Frame patch={{ snapOn: false }}>
      <Timeline />
    </Frame>
  ),
};

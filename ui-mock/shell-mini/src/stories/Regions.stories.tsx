/* Region stories (D8) — each shell region solo (topbar, media pool,
   viewer, inspector) in fixed-size frames so the leaves are reviewable
   without the full shell. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import { Topbar } from '../shell/Topbar';
import { MediaPool } from '../shell/MediaPool';
import { Viewer } from '../shell/Viewer';
import { Inspector } from '../shell/Inspector';
import { useMini } from '../state/useMini';

const meta: Meta = {
  title: 'Regions',
};
export default meta;

function Boot({ patch }: { patch?: Partial<ReturnType<typeof useMini.getState>> }) {
  useLayoutEffect(() => {
    if (patch) useMini.setState(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  }, []);
  return null;
}

function Backdrop({ children, w = 1400, h = 900 }: { children: React.ReactNode; w?: number; h?: number }) {
  return (
    <div
      style={{
        background: '#0d0d0d',
        backgroundImage: 'radial-gradient(#383838 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 48,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

export const TopbarDefault: StoryObj = {
  name: 'Topbar — default',
  render: () => (
    <Backdrop h={56}>
      <Boot />
      <Topbar />
    </Backdrop>
  ),
};

export const TopbarPlaying: StoryObj = {
  name: 'Topbar — playing (pause icon)',
  render: () => (
    <Backdrop h={56}>
      <Boot patch={{ playing: true, playhead: 4.2 }} />
      <Topbar />
    </Backdrop>
  ),
};

export const MediaPoolDefault: StoryObj = {
  name: 'Media pool — 4 seed assets',
  render: () => (
    <Backdrop w={260} h={600}>
      <Boot />
      <MediaPool />
    </Backdrop>
  ),
};

export const ViewerDefault: StoryObj = {
  name: 'Viewer — clip under playhead (info bottom-left + play pill)',
  render: () => (
    <Backdrop w={900} h={620}>
      <Boot patch={{ playhead: 1 }} />
      <Viewer />
    </Backdrop>
  ),
};

export const ViewerPlaying: StoryObj = {
  name: 'Viewer — playing (no play overlay)',
  render: () => (
    <Backdrop w={900} h={620}>
      <Boot patch={{ playing: true, playhead: 2.7 }} />
      <Viewer />
    </Backdrop>
  ),
};

export const ViewerEmpty: StoryObj = {
  name: 'Viewer — empty state (playhead past content)',
  render: () => (
    <Backdrop w={900} h={620}>
      <Boot patch={{ playhead: 12.5 }} />
      <Viewer />
    </Backdrop>
  ),
};

export const InspectorVideo: StoryObj = {
  name: 'Inspector — video clip selected',
  render: () => (
    <Backdrop w={240} h={620}>
      <Boot patch={{ selectedId: 'c2' }} />
      <Inspector />
    </Backdrop>
  ),
};

export const InspectorAudio: StoryObj = {
  name: 'Inspector — audio clip selected (nudge at boundary)',
  render: () => (
    <Backdrop w={240} h={620}>
      <Boot patch={{ selectedId: 'c4' }} />
      <Inspector />
    </Backdrop>
  ),
};

export const InspectorEmpty: StoryObj = {
  name: 'Inspector — empty state',
  render: () => (
    <Backdrop w={240} h={620}>
      <Boot />
      <Inspector />
    </Backdrop>
  ),
};

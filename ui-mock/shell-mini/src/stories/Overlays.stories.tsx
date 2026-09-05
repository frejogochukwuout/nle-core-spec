/* Overlay stories (D8) — the toast surface at each state. The toast is
   patched directly into state (NOT via pushToast): the real action would
   arm ToastRegion's 2.6s auto-dismiss and blank the story mid-review
   (review finding #12). */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import { ToastRegion } from '../shell/ToastRegion';
import { useMini } from '../state/useMini';

const meta: Meta = {
  title: 'Overlays',
};
export default meta;

function BootToast(kind: 'info' | 'error', text: string) {
  return function Boot() {
    useLayoutEffect(() => {
      useMini.setState({ toast: { kind, text, seq: 1 } }); // persistent review state
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
    }, []);
    return null;
  };
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#0d0d0d',
        backgroundImage: 'radial-gradient(#383838 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}

export const ToastInfo: StoryObj = {
  name: 'Toast — info (clip added)',
  render: () => {
    const Boot = BootToast('info', 'Added title_card.png to V1.');
    return (
      <Stage>
        <Boot />
        <ToastRegion />
      </Stage>
    );
  },
};

export const ToastEmpty: StoryObj = {
  name: 'Toast — honest empty-timeline feedback',
  render: () => {
    const Boot = BootToast('info', 'Nothing to play — the timeline is empty.');
    return (
      <Stage>
        <Boot />
        <ToastRegion />
      </Stage>
    );
  },
};

export const ToastExport: StoryObj = {
  name: 'Toast — Export CTA honesty',
  render: () => {
    const Boot = BootToast('info', 'Export isn’t wired in the mini — this is a UI mock.');
    return (
      <Stage>
        <Boot />
        <ToastRegion />
      </Stage>
    );
  },
};

export const ToastError: StoryObj = {
  name: 'Toast — error style',
  render: () => {
    const Boot = BootToast('error', 'Something went wrong (mock error state).');
    return (
      <Stage>
        <Boot />
        <ToastRegion />
      </Stage>
    );
  },
};

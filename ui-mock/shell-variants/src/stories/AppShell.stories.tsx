/* AppShell stories — the four page modes of the full spec-18 §3 layout.
   Fullscreen; the store defaults already give "media pool + inspector on".
   The window-too-small overlay is CSS-driven (media query) and is
   deliberately not a story — preview it by resizing the browser. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { FullShell } from './decorators';

const meta: Meta = {
  title: 'Shell/AppShell',
  parameters: { layout: 'fullscreen' },
};

export default meta;

/** Edit page — store defaults (media pool + inspector on, mixer collapsed). */
export const Edit: StoryObj = {
  name: 'Full Shell — Edit',
  render: () => <FullShell />,
};

/** Audio focus (design doc §3): SoundLibrary swaps the pool, ChannelEditor
 *  swaps the inspector, mixer dock expands to full, audio lanes boost. */
export const AudioFocus: StoryObj = {
  name: 'Full Shell — Audio Focus',
  render: () => (
    <FullShell
      patch={{
        page: 'audio',
        mixerState: 'full',
        audioLaneBoost: true,
        stripFocus: 'tr-audio-1',
      }}
    />
  ),
};

/** Color page — grading stack swaps the right rail (ColorPage). */
export const Color: StoryObj = {
  name: 'Full Shell — Color',
  render: () => <FullShell patch={{ page: 'color' }} />,
};

/** Deliver page — export panel swaps the right rail (DeliverPage). */
export const Deliver: StoryObj = {
  name: 'Full Shell — Deliver',
  render: () => <FullShell patch={{ page: 'deliver' }} />,
};

/* ---- R19 reference-integration stories ---- */

/** Marker selected — the rail swaps to the embedded MarkerInspector (the
 *  reference's marker DIALOG as a panel, per the user directive). */
export const MarkerInspectorStory: StoryObj = {
  name: 'Full Shell — Marker Inspector',
  render: () => (
    <FullShell
      patch={{
        selection: [],
        selectedMarkerId: 'mk-5',
      }}
    />
  ),
};

/** Caption selected — the rail swaps to the CaptionInspector (editor +
 *  list table); the captions lane is in the timeline below. */
export const CaptionInspectorStory: StoryObj = {
  name: 'Full Shell — Caption Inspector',
  render: () => <FullShell patch={{ selection: ['cap-3'] }} />,
};

/** Marker + range story: the purple 17→24 range marker + a point marker
 *  with notes selected; ruler marker band + clip markers visible. */
export const MarkersV2: StoryObj = {
  name: 'Full Shell — Markers v2 (range + notes)',
  render: () => (
    <FullShell
      patch={{
        selection: [],
        selectedMarkerId: 'mk-3',
        playhead: 15.5,
      }}
    />
  ),
};

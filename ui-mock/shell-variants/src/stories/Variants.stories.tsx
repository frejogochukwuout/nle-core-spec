/* Variant preset stories — the three directions from lib/variants.ts PRESETS,
   each as a complete shell. This is the A/B/C review surface: pick a story,
   screenshot, compare. Per-dimension exploration stays in the standalone app
   (ctrl+` debug overlay) — Storybook keeps them fixed and linkable. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { PRESETS } from '../lib/variants';
import { FullShell } from './decorators';

const meta: Meta = {
  title: 'Shell/Variants',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type PresetStory = StoryObj; // no args: presetStory(id) ignores args — no controllable-knob generic (R13 review: dead args type)

const presetStory = (id: 'A' | 'B' | 'C', name: string): PresetStory => {
  const preset = PRESETS.find((p) => p.id === id)!;
  return {
    name,
    parameters: { docs: { description: { story: `${preset.tagline} — ${preset.specNote}` } } },
    render: () => <FullShell variant={preset.variant} />,
  };
};

/** Preset A — Resolve Classic: spec-18 §9 canon, maximal density, gold. */
export const PresetA: PresetStory = presetStory('A', 'Preset A — Resolve Classic');

/** Preset B — Modern Studio: elevated dark, comfortable density, violet, slim headers. */
export const PresetB: PresetStory = presetStory('B', 'Preset B — Modern Studio');

/** Preset C — Editorial Light: light chrome, near-black monitor, gold. */
export const PresetC: PresetStory = presetStory('C', 'Preset C — Editorial Light');

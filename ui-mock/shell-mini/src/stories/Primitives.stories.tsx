/* Primitives stories (R18k restructure) — the MICRO level of the taxonomy:
   the purpose-drawn glyph family + the kind-badge trio + the toolbar's
   lucide toggles, so the icon GRAMMAR itself is reviewable before it is
   seen in context (the trim/split glyphs went through exactly this kind
   of review in R18g/R18h — "reads as trim-head, not jump-to-start").
   One story, one control (chip on/off) — not a list item per glyph. */

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Film,
  Image as ImageIcon,
  AudioLines,
  Magnet,
  FoldHorizontal,
  Eye,
  Play,
  Pause,
  PanelBottomClose,
} from 'lucide-react';
import { TrimStartIcon, TrimEndIcon, SplitIcon } from '../lib/icons';

const meta: Meta = {
  title: 'Primitives',
};
export default meta;

interface GlyphArgs {
  /** render each glyph on a toolbar chip (its real context surface) */
  chip: boolean;
}

const FAMILY: { name: string; note: string; node: React.ReactNode }[] = [
  {
    name: 'TrimStart',
    note: 'cut head — dim block discarded before the playhead',
    node: <TrimStartIcon aria-hidden="true" />,
  },
  {
    name: 'TrimEnd',
    note: 'cut tail — dim block discarded after the playhead',
    node: <TrimEndIcon aria-hidden="true" />,
  },
  {
    name: 'Split',
    note: 'playhead cuts the middle, both halves solid',
    node: <SplitIcon aria-hidden="true" />,
  },
  { name: 'Film', note: 'video kind badge (pool corner)', node: <Film size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'Image', note: 'image kind badge', node: <ImageIcon size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'AudioLines', note: 'audio kind badge', node: <AudioLines size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'Magnet', note: 'snap toggle (edit-point magnet)', node: <Magnet size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'FoldHorizontal', note: 'ripple edit toggle', node: <FoldHorizontal size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'Eye', note: 'audio-lane visibility', node: <Eye size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'Play / Pause', note: 'transport pair', node: <Play size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'PanelBottomClose', note: 'timeline minimize (leads the toolbar)', node: <PanelBottomClose size={14} strokeWidth={1.75} aria-hidden="true" /> },
  { name: 'Pause', note: 'transport pair', node: <Pause size={14} strokeWidth={1.75} aria-hidden="true" /> },
];

export const Glyphs: StoryObj<GlyphArgs> = {
  name: 'Glyphs — the icon family',
  args: { chip: true },
  argTypes: {
    chip: { control: 'boolean', description: 'Render each glyph on a toolbar chip (its real context surface)' },
  },
  render: ({ chip }) => (
    <div
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #17181a 0%, #111214 46%, #0d0d0d 100%)',
        minHeight: '100vh',
        padding: 32,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <p
          style={{
            color: 'rgba(255,255,255,0.52)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 20px',
          }}
        >
          Icon grammar — purpose-drawn family first, then the context toggles
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 10,
          }}
        >
          {FAMILY.map((g) => (
            <div
              key={g.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(24, 25, 27, 0.92)',
                border: '1px solid rgba(255,255,255,0.065)',
              }}
            >
              {chip ? (
                <span
                  className="qc-toolbar__icon"
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {g.node}
                </span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.84)', display: 'inline-flex', width: 34, justifyContent: 'center' }}>{g.node}</span>
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: 650 }}>{g.name}</span>
                <span style={{ display: 'block', color: 'rgba(255,255,255,0.52)', fontSize: 10, lineHeight: 1.5 }}>{g.note}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

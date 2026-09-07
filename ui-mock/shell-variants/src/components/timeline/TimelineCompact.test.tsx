/* TimelineCompact — R22-D6 (DESIGN-R22; issue #75: "this as the most
   compact view for timeline is actually quite nice ... a timeline style
   that can be generalized"). Pins:
   - the frozen anatomy: 22px ruler + per-kind lanes (video 24 / caption 20 /
     audio 16 dimmed) + 30px badge column;
   - the V/A/T color coding (#75): the clip border/tint + the badge carry
     the reference tokens (--clip-video / --clip-audio-a / --clip-text);
   - click-to-target: a clip click sets selection + re-targets clip mode;
   - NO drag/trim handles ever (frozen by law — the surface has no
     interactive children beyond the clip buttons). */

import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimelineCompact } from './TimelineCompact';
import { useUi } from '../../state/useUiStore';
import { type UiPatch } from '../../test/helpers';

type Patch = UiPatch;

const setStore = (patch?: Patch) => {
  useUi.setState((s) => ({
    page: 'color',
    scenes: s.scenes,
    selection: ['el-2'],
    colorGradeTarget: 'clip',
    ...(patch ?? {}),
  }));
};

const mount = (patch?: Patch) => {
  setStore(patch);
  return render(<TimelineCompact />);
};

const S = () => useUi.getState();

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

describe('TimelineCompact — the frozen anatomy (C51 set, kept)', () => {
  it('renders the root, the ruler, and one lane per track with badges', () => {
    const { container } = mount();
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact-ruler')).toBeInTheDocument();
    // the mock scene's tracks all get lanes (video, overlay, audio, caption)
    const lanes = container.querySelectorAll('[data-testid^="shell-timeline-compact-lane-"]');
    expect(lanes.length).toBeGreaterThanOrEqual(4);
    // badges: the track ids ride the 30px column (tr-main = V1)
    expect(container.querySelector('[data-testid="shell-timeline-compact-lane-tr-main"] [data-testid="shell-timeline-compact-clip-el-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="shell-timeline-compact-lane-tr-caption"]')).toBeTruthy();
  });

  it('audio lanes render dimmed; clips are buttons (click-to-target), never drag/trim handles', () => {
    const { container } = mount();
    const audioLane = container.querySelector('[data-testid^="shell-timeline-compact-lane-tr-audio"]');
    expect(audioLane?.className).toContain('opacity-55');
    // frozen law: the only interactive elements are the clip buttons
    const clip = screen.getByTestId('shell-timeline-compact-clip-el-2');
    expect(clip.tagName).toBe('BUTTON');
    expect(container.querySelectorAll('[data-testid*="trim"], [data-testid*="fade-object"], [data-testid*="resize"]')).toHaveLength(0);
  });
});

describe('TimelineCompact — the V/A/T color coding (#75)', () => {
  it('the clip border + tint carry the kind tokens (video/audio/text), not the old grey', () => {
    const { container } = mount();
    // the style ATTRIBUTES carry the tokens (jsdom does not resolve var() —
    // toHaveStyle would compute; the inline style is the contract)
    const clipEl = screen.getByTestId('shell-timeline-compact-clip-el-1'); // main-track clip, NOT selected
    expect(clipEl.style.borderColor).toBe('var(--clip-video)');
    expect(clipEl.style.background).toContain('var(--clip-video)');
    const audioClip = container.querySelector('[data-testid^="shell-timeline-compact-lane-tr-audio"] [data-testid^="shell-timeline-compact-clip-"]');
    expect((audioClip as HTMLElement).style.borderColor).toBe('var(--clip-audio-a)');
    const captionClip = container.querySelector('[data-testid="shell-timeline-compact-lane-tr-caption"] [data-testid^="shell-timeline-compact-clip-"]');
    expect((captionClip as HTMLElement).style.borderColor).toBe('var(--clip-text)');
  });

  it('the selected clip carries the accent border + tint (target highlight)', () => {
    mount({ selection: ['el-2'] });
    const clip = screen.getByTestId('shell-timeline-compact-clip-el-2');
    expect(clip).toHaveAttribute('aria-pressed', 'true');
    expect(clip.style.borderColor).toBe('var(--accent-selection)');
  });
});

describe('TimelineCompact — click-to-target (the color page law)', () => {
  it('clicking a clip sets selection[0] + re-targets clip mode', () => {
    mount({ selection: [], colorGradeTarget: 'timeline' });
    fireEvent.click(screen.getByTestId('shell-timeline-compact-clip-el-1'));
    expect(S().selection).toEqual(['el-1']);
    expect(S().colorGradeTarget).toBe('clip');
    expect(screen.getByTestId('shell-timeline-compact-clip-el-1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('the playhead marker rides the strip at the store playhead (read-only)', () => {
    const { container } = mount({ playhead: 4 });
    // the marker is the w-px absolute with the accent background
    const marker = container.querySelector('[data-testid="shell-timeline-compact"] .pointer-events-none.absolute.w-px');
    expect(marker).toBeTruthy();
    expect(marker?.className).toContain('z-[3]');
  });
});

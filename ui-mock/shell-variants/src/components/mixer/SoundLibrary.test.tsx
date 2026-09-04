/* SoundLibrary component tests — the Audio-focus media-pool swap (design doc
   §3.2): role-grouped listing of audio + audio-bearing video, search filter +
   no-result state, media-selection wiring, double-click reveal, and the
   Import-sound CTA. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { SoundLibrary } from './SoundLibrary';
import { renderPlain, store } from '../../test/helpers';

const item = (name: RegExp) => screen.getByRole('button', { name });

const itemNames = () =>
  screen.getAllByTestId('shell-soundlibrary-item').map((b) => b.getAttribute('aria-label') ?? '');

describe('SoundLibrary', () => {
  it('lists audio + audio-bearing video grouped by role; offline video and stills excluded (design doc §3.2)', () => {
    renderPlain(<SoundLibrary />);
    // groups render in ROLES order (dialogue, bgm, sfx, music) — only non-empty groups
    expect(itemNames()).toEqual([
      expect.stringMatching(/interview_marina\.mp4/), // m-02 (dialogue, V+A)
      expect.stringMatching(/interview_marina\.wav/), // m-07 (dialogue)
      expect.stringMatching(/ocean_ambience\.wav/), // m-06 (bgm)
      expect.stringMatching(/drone_launch\.mp4/), // m-03 (sfx default)
      expect.stringMatching(/sunset_timelapse\.mp4/), // m-05 (sfx default)
      expect.stringMatching(/A012_C034_beach_wide\.mp4/), // m-01 (music)
    ]);
    expect(screen.getByText('Dialogue')).toBeInTheDocument();
    expect(screen.getByText('BGM')).toBeInTheDocument();
    expect(screen.getByText('SFX')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.queryByText(/waves_closeup/)).toBeNull(); // m-04 offline → excluded
    expect(screen.queryByText(/title_card/)).toBeNull(); // still image → excluded
  });

  it('audio-bearing video items carry the V+A chip (design doc §3.2)', () => {
    renderPlain(<SoundLibrary />);
    const videoItem = item(/interview_marina\.mp4/);
    expect(within(videoItem).getByText('V+A')).toBeInTheDocument();
    expect(within(item(/ocean_ambience\.wav/)).queryByText('V+A')).toBeNull();
  });

  it('clicking an item selects it in the shared media-selection store (spec 18 §4.2)', () => {
    renderPlain(<SoundLibrary />);
    fireEvent.click(item(/ocean_ambience\.wav/));
    expect(store().mediaSelection).toEqual(['m-06']);
    expect(item(/ocean_ambience\.wav/).className).toContain('border-accent'); // selected row
  });

  it('double-click reveals the clip: playhead jumps to its first use in the active scene', () => {
    renderPlain(<SoundLibrary />);
    fireEvent.doubleClick(item(/interview_marina\.wav/)); // el-7 starts at 8.5 s
    expect(store().playhead).toBeCloseTo(8.6, 5);
  });

  it('search filters the list live; a dead search shows the no-result state', () => {
    renderPlain(<SoundLibrary />);
    fireEvent.change(screen.getByLabelText('Search sounds'), { target: { value: 'marina' } });
    expect(screen.getAllByTestId('shell-soundlibrary-item')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Search sounds'), { target: { value: 'zzz' } });
    expect(screen.getByTestId('shell-soundlibrary-state-noresult')).toHaveTextContent('No sounds match');
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(screen.getAllByTestId('shell-soundlibrary-item')).toHaveLength(6);
  });

  it('the Import CTA explains the mock import path as a toast (spec 18 §8.8 honest mock)', () => {
    renderPlain(<SoundLibrary />);
    fireEvent.click(screen.getByRole('button', { name: 'Import sound' }));
    expect(store().toasts.at(-1)!.title).toBe('Import sound');
    expect(store().toasts.at(-1)!.kind).toBe('info');
  });

  it('the footer counts live-region reports items + selection (design doc §3.2)', () => {
    renderPlain(<SoundLibrary />);
    expect(screen.getByText('6 sounds · 1 selected')).toBeInTheDocument(); // m-02 ships selected
  });
});

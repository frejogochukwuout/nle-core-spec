/* SoundLibrary component tests — the Audio-focus media-pool swap (design doc
   §3.2): role-grouped listing of audio + audio-bearing video, search filter +
   no-result state, media-selection wiring, double-click reveal, and the
   Import-sound CTA. */

import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { SoundLibrary } from './SoundLibrary';
import { renderPlain, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

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

  it('the sort control re-orders items within the role groups (R14: header parity made true)', () => {
    renderPlain(<SoundLibrary />);
    // default name-asc: SFX group = drone_launch (18.6s) then sunset (12.8s)
    expect(itemNames()[3]).toMatch(/drone_launch/);
    expect(itemNames()[4]).toMatch(/sunset_timelapse/);
    // duration asc flips the SFX pair (12.8s < 18.6s)
    fireEvent.change(screen.getByLabelText('Sort sounds'), { target: { value: 'duration' } });
    expect(itemNames()[3]).toMatch(/sunset_timelapse/);
    expect(itemNames()[4]).toMatch(/drone_launch/);
    // desc flips it back
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));
    expect(itemNames()[3]).toMatch(/drone_launch/);
    expect(itemNames()[4]).toMatch(/sunset_timelapse/);
    // type asc: within Dialogue, the .wav (audio) precedes the .mp4 (video)
    fireEvent.change(screen.getByLabelText('Sort sounds'), { target: { value: 'type' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));
    expect(itemNames()[0]).toMatch(/interview_marina\.wav/);
    expect(itemNames()[1]).toMatch(/interview_marina\.mp4/);
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

/* R20-W5 (thread #67 / D1.5): the mode filter — the SoundLibrary IS the
   audio-page pool (LeftDock swap), so it honors poolModeFilter directly:
   ON = audio + audio-bearing video (the default), OFF = the whole media
   pool, with the honest count chip + 'Audio only' toggle. */
describe('SoundLibrary R20-W5 — the mode filter (thread #67)', () => {
  afterEach(() => {
    useUi.setState({ poolModeFilter: true });
  });

  it('default ON: the count chip reads 6/8 and the toggle is pressed', () => {
    useUi.setState({ poolModeFilter: true });
    renderPlain(<SoundLibrary />);
    expect(screen.getByTestId('shell-soundlibrary-count')).toHaveTextContent('6/8');
    const toggle = screen.getByTestId('shell-soundlibrary-audio-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('aria-label', 'Audio only');
  });

  it('toggling OFF lists the WHOLE media pool (8 items incl. the offline video + still) — chip honest', () => {
    useUi.setState({ poolModeFilter: true });
    renderPlain(<SoundLibrary />);
    fireEvent.click(screen.getByTestId('shell-soundlibrary-audio-toggle'));
    expect(store().poolModeFilter).toBe(false); // shared view-state write (the pool respects it too)
    expect(screen.getAllByTestId('shell-soundlibrary-item')).toHaveLength(8);
    expect(screen.getByTestId('shell-soundlibrary-count')).toHaveTextContent('8/8');
    expect(screen.getByText(/waves_closeup/)).toBeInTheDocument(); // offline video now listed
    expect(screen.getByText(/title_card/)).toBeInTheDocument(); // still now listed
    expect(screen.getByTestId('shell-soundlibrary-audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  it('the footer note is honest about the filter state', () => {
    useUi.setState({ poolModeFilter: true });
    renderPlain(<SoundLibrary />);
    expect(screen.getByText(/audio-bearing video included/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-soundlibrary-audio-toggle'));
    expect(screen.getByText(/all media — Audio only is off/)).toBeInTheDocument();
  });
});

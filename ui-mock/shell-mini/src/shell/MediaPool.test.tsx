/* MediaPool tabs (R18i, shell thread #11 — "introduce tabs so we can
   switch media types"): the panel head is a segmented All/Video/Image/Audio
   control; the list filters by kind; an empty tab is honest about it.
   View-only state: filtering never touches the doc or history. */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MediaPool } from './MediaPool';
import { useMini } from '../state/useMini';
import { seedDoc } from '../lib/mockData';

const S = () => useMini.getState();

beforeEach(() => {
  S().reset();
});

const cardIds = () =>
  within(screen.getByTestId('mini-pool-list'))
    .queryAllByTestId(/^mini-media-/)
    .map((el) => el.getAttribute('data-testid'));

describe('pool type tabs (R18i thread #11)', () => {
  it('renders the four tabs in the panel head with All active by default', () => {
    render(<MediaPool />);
    for (const id of ['all', 'video', 'image', 'audio']) {
      const tab = screen.getByTestId(`mini-pool-tab-${id}`);
      expect(tab).toBeInTheDocument();
      expect(tab.getAttribute('aria-pressed')).toBe(id === 'all' ? 'true' : 'false');
    }
  });

  it('All shows every media item (seed: 8)', () => {
    render(<MediaPool />);
    expect(cardIds()).toHaveLength(8);
  });

  it('Video filters to video-kind only', () => {
    render(<MediaPool />);
    fireEvent.click(screen.getByTestId('mini-pool-tab-video'));
    expect(screen.getByTestId('mini-pool-tab-video').getAttribute('aria-pressed')).toBe('true');
    const ids = cardIds();
    expect(ids).toHaveLength(4); // drone, beach, gopro, sunset
    expect(ids).toContain('mini-media-m-drone');
    expect(ids).not.toContain('mini-media-m-interview'); // audio
    expect(ids).not.toContain('mini-media-m-title'); // image
  });

  it('Audio filters to audio-kind only', () => {
    render(<MediaPool />);
    fireEvent.click(screen.getByTestId('mini-pool-tab-audio'));
    const ids = cardIds();
    expect(ids).toHaveLength(2); // interview, ambience
    expect(ids).toContain('mini-media-m-interview');
    expect(ids).toContain('mini-media-m-ambience');
  });

  it('Image filters to image-kind only', () => {
    render(<MediaPool />);
    fireEvent.click(screen.getByTestId('mini-pool-tab-image'));
    const ids = cardIds();
    expect(ids).toHaveLength(2); // title_card, lower_third
    expect(ids).toContain('mini-media-m-lower');
  });

  it('switching back to All restores the full list', () => {
    render(<MediaPool />);
    fireEvent.click(screen.getByTestId('mini-pool-tab-audio'));
    fireEvent.click(screen.getByTestId('mini-pool-tab-all'));
    expect(cardIds()).toHaveLength(8);
  });

  it('empty tab shows the honest empty state, not a silent blank', () => {
    render(<MediaPool />);
    // empty the image media out of the doc (setState: commit's docChanged
    // compares tracks + clips, never media, so a media-only _commit would
    // be a no-op)
    useMini.setState({
      doc: { ...S().doc, media: S().doc.media.filter((m) => m.kind !== 'image') },
    });
    fireEvent.click(screen.getByTestId('mini-pool-tab-image'));
    expect(cardIds()).toHaveLength(0);
    expect(screen.getByTestId('mini-pool-empty').textContent).toContain('No image media');
  });

  it('filtering is view-only: the doc and history stay untouched', () => {
    render(<MediaPool />);
    const before = S().doc;
    fireEvent.click(screen.getByTestId('mini-pool-tab-audio'));
    fireEvent.click(screen.getByTestId('mini-pool-tab-video'));
    expect(S().doc).toBe(before); // same reference — no store write at all
    expect(S().past).toHaveLength(0);
  });
});

/* ---- R18j: collapse rail (thread #14), hover preview (thread #15),
   image duration honesty (thread #18) -------------------------------- */

describe('R18j pool collapse rail (thread #14)', () => {
  it('collapsed pool renders the vertical-label rail, not the list', () => {
    S().setPoolCollapsed(true);
    render(<MediaPool />);
    expect(screen.getByTestId('mini-pool-collapsed')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-pool-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-pool-tab-all')).not.toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('rail click expands (individual mode)', () => {
    S().setPoolCollapsed(true);
    render(<MediaPool />);
    fireEvent.click(screen.getByTestId('mini-btn-pool-expand'));
    expect(S().poolCollapsed).toBe(false);
    expect(screen.getByTestId('mini-pool-list')).toBeInTheDocument();
  });

  it('rail click under viewerMax EXITS max mode instead', () => {
    S().setPoolCollapsed(false);
    useMini.setState({ viewerMax: true });
    render(<MediaPool />);
    expect(screen.getByTestId('mini-pool-collapsed')).toBeInTheDocument(); // OR'd collapse
    fireEvent.click(screen.getByTestId('mini-btn-pool-expand'));
    expect(S().viewerMax).toBe(false);
    expect(S().poolCollapsed).toBe(false); // individual flag untouched
  });
});

describe('R18j hover autoplay (thread #15)', () => {
  it('hovering a VIDEO card starts the preview: chip scrubs live, thumb animates', () => {
    vi.useFakeTimers();
    try {
      render(<MediaPool />);
      const card = screen.getByTestId('mini-media-m-drone');
      expect(screen.getByTestId('mini-dur-m-drone').textContent).toBe('00:04.5'); // at rest
      fireEvent.mouseEnter(card);
      expect(card.className).toContain('is-previewing');
      expect(screen.getByTestId('mini-dur-m-drone').textContent).toBe('▶ 00:00.0');
      act(() => {
        vi.advanceTimersByTime(700); // 0.7s of "playback"
      });
      expect(screen.getByTestId('mini-dur-m-drone').textContent).toBe('▶ 00:00.7');
      // leave: preview stops, chip returns to the source length
      fireEvent.mouseLeave(card);
      expect(card.className).not.toContain('is-previewing');
      expect(screen.getByTestId('mini-dur-m-drone').textContent).toBe('00:04.5');
    } finally {
      vi.useRealTimers();
    }
  });

  it('preview loops at the source duration (never runs past the media)', () => {
    vi.useFakeTimers();
    try {
      render(<MediaPool />);
      fireEvent.mouseEnter(screen.getByTestId('mini-media-m-drone'));
      act(() => {
        vi.advanceTimersByTime(4600); // 4.5s media → wraps at 4.5
      });
      expect(screen.getByTestId('mini-dur-m-drone').textContent).toBe('▶ 00:00.1'); // 4600-4500=100ms
    } finally {
      vi.useRealTimers();
    }
  });

  it('images and audio never autoplay (nothing visual to play)', () => {
    vi.useFakeTimers();
    try {
      render(<MediaPool />);
      const img = screen.getByTestId('mini-media-m-title');
      fireEvent.mouseEnter(img);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(img.className).not.toContain('is-previewing');
      const wav = screen.getByTestId('mini-media-m-interview');
      fireEvent.mouseEnter(wav);
      expect(wav.className).not.toContain('is-previewing');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('R18j image duration honesty (thread #18)', () => {
  it('image cards carry no duration chip; video/audio cards do', () => {
    render(<MediaPool />);
    expect(screen.queryByTestId('mini-dur-m-title')).not.toBeInTheDocument(); // title_card.png
    expect(screen.queryByTestId('mini-dur-m-lower')).not.toBeInTheDocument(); // lower_third.png
    expect(screen.getByTestId('mini-dur-m-drone')).toBeInTheDocument();
    expect(screen.getByTestId('mini-dur-m-interview')).toBeInTheDocument();
  });

  it('the image card aria-label drops the duration clause', () => {
    render(<MediaPool />);
    expect(screen.getByTestId('mini-media-m-title').getAttribute('aria-label')).not.toContain('00:03.5');
    expect(screen.getByTestId('mini-media-m-drone').getAttribute('aria-label')).toContain('00:04.5');
  });
});

/* ---- R18k (thread #23): video-only mode head + list ---------------- */

describe('R18k video-only mode (thread #23)', () => {
  it('video-only: no type tabs, a plain Media head, only video cards', () => {
    useMini.setState({ trackMode: 'video' });
    render(<MediaPool />);
    expect(screen.queryByTestId('mini-pool-tab-all')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-pool-tab-video')).not.toBeInTheDocument();
    expect(screen.getByTestId('mini-pool-head-video')).toBeInTheDocument();
    expect(screen.getByTestId('mini-pool-list').textContent).not.toContain('interview_audio');
    expect(screen.getByTestId('mini-media-m-drone')).toBeInTheDocument(); // video stays
    expect(screen.queryByTestId('mini-media-m-title')).not.toBeInTheDocument(); // image filtered
    expect(screen.queryByTestId('mini-media-m-interview')).not.toBeInTheDocument(); // audio filtered
  });

  it('video-only empty state is honest (no video media)', () => {
    // docChanged ignores media-only mutations — setState directly (documented trap)
    useMini.setState({
      trackMode: 'video',
      doc: { tracks: seedDoc().tracks, media: seedDoc().media.filter((m) => m.kind !== 'video'), clips: [] },
    });
    render(<MediaPool />);
    expect(screen.getByTestId('mini-pool-empty').textContent).toContain('No video media');
  });

  it('paired mode keeps the tabs (the full editor grammar survives)', () => {
    useMini.setState({ trackMode: 'paired' });
    render(<MediaPool />);
    expect(screen.getByTestId('mini-pool-tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('mini-pool-tab-video')).toBeInTheDocument();
  });
});

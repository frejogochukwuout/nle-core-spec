/* TrackHeader component tests — M/S/L/V/W toggles → the single-source
   toggleTrackCmd (spec 05 §10 / 18 §4.7), undoable history, audio-focus
   minifaders (spec 16 §3.8 / design doc §3.2), compact vs tall layout, and
   the §4.9 header menu. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { TrackHeader } from './TrackHeader';
import { renderPlain, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { __setLevel } from '../../lib/meterEngine';

/** Header harness that re-reads the track from the store so post-toggle
 *  re-renders see the fresh track object (mirrors Timeline's prop flow). */
function Header({ trackId, height = 60 }: { trackId: string; height?: number }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === 'sc-1')!);
  const track = scene.tracks.find((t) => t.id === trackId);
  if (!track) return null;
  return <TrackHeader track={track} sceneId="sc-1" height={height} />;
}

const track = (id: string) => {
  for (const t of store().scenes.find((s) => s.id === 'sc-1')!.tracks) {
    if (t.id === id) return t;
  }
  throw new Error(`track ${id} not found`);
};

describe('TrackHeader', () => {
  it('renders badge, name, meta and the M/S/L/V button set (spec 05 §10 header anatomy)', () => {
    renderPlain(<Header trackId="tr-main" height={80} />);
    expect(screen.getByTestId('shell-track-header-tr-main')).toBeInTheDocument();
    expect(screen.getByText('1920×1080')).toBeInTheDocument(); // main-track meta
    for (const label of ['Mute track V1', 'Solo track V1', 'Lock track V1', 'Toggle visibility track V1']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByTestId('shell-track-V1-btn-mute')).toHaveAttribute('aria-pressed', 'false');
  });

  it('the M button routes through toggleTrackCmd and reflects the new state (spec 18 §4.7 single source)', () => {
    renderPlain(<Header trackId="tr-main" height={80} />);
    const mute = screen.getByTestId('shell-track-V1-btn-mute');
    fireEvent.click(mute);
    expect(track('tr-main').muted).toBe(true);
    expect(screen.getByTestId('shell-track-V1-btn-mute')).toHaveAttribute('aria-pressed', 'true');
    expect(store().past).toHaveLength(1); // undoable track command (18 §6.1)
  });

  it('S and L buttons toggle solo/lock through the same command; A2 ships locked (spec 18 §4.7)', () => {
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    fireEvent.click(screen.getByTestId('shell-track-A1-btn-solo'));
    expect(track('tr-audio-1').solo).toBe(true);
    fireEvent.click(screen.getByTestId('shell-track-A1-btn-lock'));
    expect(track('tr-audio-1').locked).toBe(true);
    expect(store().past).toHaveLength(2);
    expect(screen.getByTestId('shell-track-A1-btn-solo')).toHaveAttribute('aria-pressed', 'true');
  });

  it('the W toggle: undefined default renders ON, first click normalizes to true (spec 18 §4.7 W)', () => {
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    expect(screen.queryByTestId('shell-track-A1-btn-visibility')).toBeNull(); // audio: no V button
    const wave = screen.getByTestId('shell-track-A1-btn-waveform');
    expect(wave).toHaveAttribute('aria-pressed', 'true'); // undefined ≠ false → ON
    // KNOWN QUIRK (report): tr-audio-1 ships waveform: undefined, so the first
    // toggleTrackCmd('waveform') flips undefined → true — still ON. Two clicks
    // are needed to visually switch the waveform off from the fixture default.
    fireEvent.click(wave);
    expect(track('tr-audio-1').waveform).toBe(true);
    expect(screen.getByTestId('shell-track-A1-btn-waveform')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('shell-track-A1-btn-waveform'));
    expect(track('tr-audio-1').waveform).toBe(false);
    expect(screen.getByTestId('shell-track-A1-btn-waveform')).toHaveAttribute('aria-pressed', 'false');
  });

  it('the V button toggles visibility; aria-pressed tracks the HIDDEN state (on = invisible)', () => {
    renderPlain(<Header trackId="tr-main" height={80} />);
    const vis = screen.getByTestId('shell-track-V1-btn-visibility');
    expect(vis).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(vis);
    expect(track('tr-main').visible).toBe(false);
    expect(screen.getByTestId('shell-track-V1-btn-visibility')).toHaveAttribute('aria-pressed', 'true');
  });

  it('compact lanes (height < 48) collapse to the single-row layout: no waveform button (spec 05 §10)', () => {
    renderPlain(<Header trackId="tr-audio-1" height={34} />);
    expect(screen.queryByTestId('shell-track-A1-btn-waveform')).toBeNull();
    expect(screen.getByTestId('shell-track-A1-btn-mute')).toBeInTheDocument(); // controls survive
  });

  it('audio focus shows the G-layer minifader; edit page hides it (spec 16 §3.8 audio focus)', () => {
    useUi.setState({ page: 'audio' });
    const audio = renderPlain(<Header trackId="tr-audio-1" height={60} />);
    const fader = screen.getByLabelText('A1 gain (G layer)');
    expect(fader).toBeInTheDocument();
    expect(screen.getByTestId('track-automation-A1')).toBeInTheDocument(); // M2 automation placeholder
    fireEvent.change(fader, { target: { value: '50' } });
    expect(store().mixer.tracks['tr-audio-1']!.fader).toBe(-27); // sliderToDb(0.5)
    audio.unmount();
    useUi.setState({ page: 'edit' });
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    expect(screen.queryByLabelText('A1 gain (G layer)')).toBeNull();
  });

  it('the §4.9 header menu: direct Mute/Solo/Lock entries mirror the buttons (spec 18 §4.9)', () => {
    renderPlain(<Header trackId="tr-main" height={80} />);
    fireEvent.contextMenu(screen.getByTestId('shell-track-header-tr-main'), { clientX: 5, clientY: 5 });
    const menu = screen.getByTestId('shell-menu-track');
    expect(menu).toBeInTheDocument();
    const muteItem = screen.getByTestId('shell-menu-track-mute');
    expect(muteItem).toHaveAttribute('aria-checked', 'false'); // menuitemcheckbox
    // honest-mock: delete-track ships disabled (store has no deleteTrack command)
    expect(screen.getByTestId('shell-menu-track-delete-track')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(muteItem);
    expect(track('tr-main').muted).toBe(true);
    expect(screen.queryByTestId('shell-menu-track')).not.toBeInTheDocument(); // menu closed after select
  });
});

/* R14 wiring: the automation-lane button honesty contract, the §4.9 Height
   rows (global pref), and the Add-track above/below explicit insert routes. */
describe('TrackHeader R14 wiring (§4.9 height + add above/below)', () => {
  it('the automation-lane button is aria-disabled with the M2 tip (honesty contract)', () => {
    useUi.setState({ page: 'audio' }); // set BEFORE mount (existing minifader pattern)
    const audio = renderPlain(<Header trackId="tr-audio-1" height={60} />);
    const btn = screen.getByTestId('track-automation-A1');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveAttribute('data-tip', 'Automation lane — M2 (spec 20 §12.1)');
    audio.unmount();
    useUi.setState({ page: 'edit' });
  });

  it('Height rows check the active pref and drive setTrackHeightPref (view state, no history)', () => {
    renderPlain(<Header trackId="tr-main" height={80} />);
    fireEvent.contextMenu(screen.getByTestId('shell-track-header-tr-main'), { clientX: 5, clientY: 5 });
    const compact = screen.getByTestId('shell-menu-track-height-compact');
    expect(compact).toHaveAttribute('role', 'menuitemcheckbox');
    expect(compact).toHaveAttribute('aria-checked', 'false'); // null = auto → no row checked
    fireEvent.click(compact);
    expect(store().trackHeightPref).toBe('compact');
    expect(store().past).toHaveLength(0); // view pref, not a doc mutation
    // re-open: compact is now the checked row (single-choice group)
    fireEvent.contextMenu(screen.getByTestId('shell-track-header-tr-main'), { clientX: 5, clientY: 5 });
    expect(screen.getByTestId('shell-menu-track-height-compact')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('shell-menu-track-height-tall')).toHaveAttribute('aria-checked', 'false');
  });

  it('Add track above inserts at the header index — NOT the default kind route (spec 18 §4.9)', () => {
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    fireEvent.contextMenu(screen.getByTestId('shell-track-header-tr-audio-1'), { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByTestId('shell-menu-track-add-above'));
    // default route would APPEND audio at the bottom; above puts A3 above A1
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.map((t) => t.badge))
      .toEqual(['T1', 'V1', 'A3', 'A1', 'A2']);
  });

  it('Add track below inserts one past the header index (spec 18 §4.9)', () => {
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    fireEvent.contextMenu(screen.getByTestId('shell-track-header-tr-audio-1'), { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByTestId('shell-menu-track-add-below'));
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.map((t) => t.badge))
      .toEqual(['T1', 'V1', 'A1', 'A3', 'A2']); // A3 below A1, above A2
  });
});

/* R15-A4 — audio track-header micro-meters (the v2.2 §3.2 promise, closed):
   4px view-only vertical level display fed by the SHARED metering engine —
   same useMeter(trackId) key as the strips/bridge, so header and strip can
   never disagree. aria-hidden, no segments, hidden on compact lanes. */
describe('TrackHeader R15-A4 — audio micro-meters (v2.2 §3.2)', () => {
  it('tall audio headers carry the 4px view-only micro-meter: aria-hidden, well token, no LED segments', () => {
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    const m = screen.getByTestId('track-micrometer-A1');
    expect(m).toHaveAttribute('aria-hidden', 'true');
    expect(m.className).toContain('w-[4px]');
    expect(m.className).toContain('pointer-events-none'); // view-only — never a hit target
    expect(m.className).toContain('bg-[var(--meter-well)]'); // the shared well token
    expect(m.querySelector('.meter-segments')).toBeNull(); // no 3px LEDs at 4px wide
    expect(m.querySelector('[data-testid="track-micrometer-A1-fill"]')).not.toBeNull();
  });

  it('non-audio headers and compact lanes get none (compact-safe judgment, documented)', () => {
    renderPlain(<Header trackId="tr-main" height={80} />);
    expect(screen.queryByTestId('track-micrometer-V1')).toBeNull(); // video lane — no meter
    renderPlain(<Header trackId="tr-audio-1" height={34} />);
    expect(screen.queryByTestId('track-micrometer-A1')).toBeNull(); // compact single row — no room
  });

  it('renders the shared engine level: dB-linear fill, clip latches red, effectiveMute dims', () => {
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    const fill = screen.getByTestId('track-micrometer-A1-fill') as HTMLElement;
    expect(fill.style.clipPath).toBe('inset(100% 0 0 0)'); // silent at rest
    act(() => { __setLevel('tr-audio-1', -12); });
    expect(fill.style.clipPath).toBe('inset(20% 0 0 0)'); // (−12+60)/60 — dB-linear, mono-collapsed
    expect(fill.style.background).toContain('var(--meter-green)'); // token palette
    act(() => { __setLevel('tr-audio-1', 0); });
    expect(fill.style.background).toContain('var(--meter-red)'); // clip → solid red
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-audio-1', 'muted'); });
    expect(screen.getByTestId('track-micrometer-A1').className).toContain('opacity-20'); // effectiveMute
  });

  it('header + strip read the ONE engine key — __setLevel moves both surfaces', () => {
    // the header meter alone (strip tested in ChannelStrip/MixerDock files);
    // same key contract: tr-audio-1's snapshot is shared, not header-local
    renderPlain(<Header trackId="tr-audio-1" height={60} />);
    act(() => { __setLevel('tr-audio-1', -30); });
    const fill = screen.getByTestId('track-micrometer-A1-fill') as HTMLElement;
    expect(fill.style.clipPath).toBe('inset(50% 0 0 0)'); // (−30+60)/60
  });
});

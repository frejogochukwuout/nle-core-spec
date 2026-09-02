/* TrackHeader — spec 05 §10 / 18 §4.7: name/badge, per-track M/S/L(/V)
   buttons → track commands. Height mirrors the lane (filmstrip 80/60,
   blocks 40/34/28 per kind). 18px square buttons (mock rsm-btn grammar). */

import { Lock, Eye, EyeOff, Volume2, VolumeX, Headphones } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import type { TrackJSON } from '../../lib/mockData';

function toggleTrack(sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked' | 'visible') {
  const { scenes } = useUi.getState();
  const next = scenes.map((s) =>
    s.id === sceneId
      ? { ...s, tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, [field]: !t[field] } : t)) }
      : s,
  );
  useUi.setState({ scenes: next });
}

export function TrackHeader({ track, height, sceneId }: { track: TrackJSON; height: number; sceneId: string }) {
  const showVisibility = track.kind !== 'audio';
  const badgeCls =
    track.kind === 'main'
      ? 'border-accent text-accent'
      : track.kind === 'overlay'
        ? 'border-focus text-focus'
        : 'border-wave/70 text-wave';

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b border-hairline bg-raised px-1.5"
      style={{ height, minHeight: height }}
      data-testid={`shell-track-header-${track.id}`}
    >
      <span className={`mono flex h-[20px] w-[30px] shrink-0 items-center justify-center rounded-[2px] border text-[10.5px] font-semibold ${badgeCls}`}>
        {track.badge}
      </span>

      <button
        onClick={() => toggleTrack(sceneId, track.id, 'muted')}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border ${track.muted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted hover:text-tprimary'}`}
        aria-label={`Mute track ${track.name}`}
        aria-pressed={track.muted}
        data-tip="Mute"
      >
        {track.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
      </button>
      <button
        onClick={() => toggleTrack(sceneId, track.id, 'solo')}
        className={`mono flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border text-[9.5px] font-bold ${track.solo ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-strong bg-inset text-tmuted hover:text-tprimary'}`}
        aria-label={`Solo track ${track.name}`}
        aria-pressed={track.solo}
        data-tip="Solo"
      >
        S
      </button>
      <button
        onClick={() => toggleTrack(sceneId, track.id, 'locked')}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border ${track.locked ? 'border-accent bg-accent/20 text-accent' : 'border-strong bg-inset text-tmuted hover:text-tprimary'}`}
        aria-label={`Lock track ${track.name}`}
        aria-pressed={track.locked}
        data-tip="Lock"
      >
        <Lock size={10} />
      </button>
      {showVisibility && (
        <button
          onClick={() => toggleTrack(sceneId, track.id, 'visible')}
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border border-strong bg-inset text-tmuted hover:text-tprimary"
          aria-label={`Toggle visibility track ${track.name}`}
          aria-pressed={!track.visible}
          data-tip="Visibility"
        >
          {track.visible ? <Eye size={10} /> : <EyeOff size={10} />}
        </button>
      )}

      <div className="grow" />
      <span className="mono hidden shrink-0 pr-0.5 text-[9.5px] text-tfaint 2xl:inline">
        {track.kind === 'audio' ? '48 kHz' : track.kind === 'main' ? '1920×1080' : 'text'}
      </span>
      {track.solo && <Headphones size={10} className="shrink-0 text-[var(--solo)]" aria-label="Solo active" />}
    </div>
  );
}

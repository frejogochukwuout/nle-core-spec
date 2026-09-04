/* TrackHeader — spec 05 §10 / 18 §4.7: badge + name, per-track M/S/L(/V)
   buttons → track commands. Reference grammar (davinci mock): tall lanes get
   TWO rows (row 1: badge + name + meta; row 2: controls), short lanes get a
   single compact control row — everything fits the fixed 160px column with
   no horizontal overflow. */

import { Lock, Eye, EyeOff, Volume2, VolumeX, Headphones, Activity } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import type { TrackJSON } from '../../lib/mockData';

function toggleTrack(sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked' | 'visible' | 'waveform') {
  const { scenes } = useUi.getState();
  const next = scenes.map((s) =>
    s.id === sceneId
      ? { ...s, tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, [field]: !t[field] } : t)) }
      : s,
  );
  useUi.setState({ scenes: next });
}

function CtrlBtn({ track, sceneId, field, label, tip, on, onCls, children, testid }: {
  track: TrackJSON; sceneId: string; field: 'muted' | 'solo' | 'locked' | 'visible' | 'waveform';
  label: string; tip: string; on: boolean; onCls: string; children: React.ReactNode; testid: string;
}) {
  return (
    <button
      onClick={() => toggleTrack(sceneId, track.id, field)}
      data-testid={testid}
      className={`mono flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border text-[10px] font-bold ${on ? onCls : 'border-strong bg-inset text-tmuted hover:text-tprimary'}`}
      aria-label={`${label} track ${track.name}`}
      aria-pressed={on}
      data-tip={tip}
    >
      {children}
    </button>
  );
}

export function TrackHeader({ track, height, sceneId }: { track: TrackJSON; height: number; sceneId: string }) {
  const showVisibility = track.kind !== 'audio';
  const tall = height >= 48; // two-row layout; single compact row below 48px
  const badgeCls =
    track.kind === 'main'
      ? 'border-[var(--type-video)] text-[var(--type-video)]'
      : track.kind === 'overlay'
        ? 'border-[var(--type-overlay)] text-[var(--type-overlay)]'
        : 'border-[var(--type-audio)] text-[var(--type-audio)]';

  const badge = (
    <span className={`mono flex h-[20px] w-[30px] shrink-0 items-center justify-center rounded-[2px] border text-[11px] font-semibold ${badgeCls}`}>
      {track.badge}
    </span>
  );

  const meta = track.kind === 'audio' ? '48 kHz' : track.kind === 'main' ? '1920×1080' : 'text';

  const controls = (
    <div className="flex items-center gap-1">
      <CtrlBtn track={track} sceneId={sceneId} field="muted" label="Mute" tip="Mute"
        on={track.muted} onCls="border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black"
        testid={`shell-track-${track.badge}-btn-mute`}>
        {track.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
      </CtrlBtn>
      <CtrlBtn track={track} sceneId={sceneId} field="solo" label="Solo" tip="Solo"
        on={track.solo} onCls="border-[var(--solo)] bg-[var(--solo)] text-black"
        testid={`shell-track-${track.badge}-btn-solo`}>
        S
      </CtrlBtn>
      <CtrlBtn track={track} sceneId={sceneId} field="locked" label="Lock" tip="Lock"
        on={track.locked} onCls="border-accent bg-accent/20 text-accent"
        testid={`shell-track-${track.badge}-btn-lock`}>
        <Lock size={10} />
      </CtrlBtn>
      {showVisibility && (
        <CtrlBtn track={track} sceneId={sceneId} field="visible" label="Toggle visibility" tip="Visibility"
          on={!track.visible} onCls="border-strong bg-inset text-tfaint"
          testid={`shell-track-${track.badge}-btn-visibility`}>
          {track.visible ? <Eye size={10} /> : <EyeOff size={10} />}
        </CtrlBtn>
      )}
      {track.kind === 'audio' && tall && (
        <CtrlBtn track={track} sceneId={sceneId} field="waveform" label="Waveform view" tip="Waveform / clip view"
          on={track.waveform !== false} onCls="border-strong bg-inset text-tprimary"
          testid={`shell-track-${track.badge}-btn-waveform`}>
          <Activity size={10} />
        </CtrlBtn>
      )}
    </div>
  );

  return (
    <div
      className="flex shrink-0 flex-col justify-center gap-[3px] border-b border-hairline bg-raised px-2"
      style={{ height, minHeight: height, overflow: 'hidden' }}
      data-testid={`shell-track-header-${track.id}`}
      title={`${track.name} · ${meta}`}
    >
      {tall ? (
        <>
          <div className="flex w-full items-center gap-1.5">
            {badge}
            <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{track.name}</span>
            {track.solo && <Headphones size={10} className="shrink-0 text-[var(--solo)]" aria-label="Solo active" />}
            <span className="mono shrink-0 text-[10px] text-tfaint">{meta}</span>
          </div>
          <div className="flex w-full items-center gap-1">
            {controls}
            <div className="grow" />
          </div>
        </>
      ) : (
        /* compact single row: badge + controls; name via title attr */
        <div className="flex w-full items-center gap-1.5">
          {badge}
          {controls}
          {track.solo && <Headphones size={10} className="shrink-0 text-[var(--solo)]" aria-label="Solo active" />}
        </div>
      )}
    </div>
  );
}

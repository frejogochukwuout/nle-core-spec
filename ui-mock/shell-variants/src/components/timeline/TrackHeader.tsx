/* TrackHeader — spec 05 §10 / 18 §4.7: badge + name, per-track M/S/L(/V)
   buttons → track commands. Reference grammar (davinci mock): tall lanes get
   TWO rows (row 1: badge + name + meta; row 2: controls), short lanes get a
   single compact control row — everything fits the fixed 160px column with
   no horizontal overflow. */

import { Lock, Eye, EyeOff, Volume2, VolumeX, Headphones, Activity } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import type { TrackJSON } from '../../lib/mockData';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';

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
  const addTrack = useUi((s) => s.addTrack);
  const menu = useContextMenu(); // §4.9 track-header menu

  /* §4.9 track-header menu — direct toggles reuse the module-level
     toggleTrack helper (the M/S/L buttons use it too). "Delete track" is
     honestly disabled: the mock store has no deleteTrack command, so the
     §6.4 with-clips confirmation has no real path here (deleteScene + the
     clip-menu multi-delete carry the confirm consumers instead). */
  const kindLabel = track.kind === 'main' ? 'video' : track.kind === 'overlay' ? 'text' : 'audio';
  const buildMenuItems = (): MenuItem[] => [
    { id: 'add-track', label: `Add ${kindLabel} track`, onSelect: () => addTrack(track.kind) },
    { id: 'rename', label: 'Rename track', disabled: true, tip: 'mock: inline rename needs the track-name update command', sep: true },
    { id: 'mute', label: 'Mute', checked: track.muted, sep: true, onSelect: () => toggleTrack(sceneId, track.id, 'muted') },
    { id: 'solo', label: 'Solo', checked: track.solo, onSelect: () => toggleTrack(sceneId, track.id, 'solo') },
    { id: 'lock', label: 'Lock', checked: track.locked, onSelect: () => toggleTrack(sceneId, track.id, 'locked') },
    { id: 'delete-track', label: 'Delete track', danger: true, disabled: true, tip: 'mock: needs deleteTrack command', sep: true },
  ];
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
      tabIndex={-1} /* focusable host for the §4.9 Shift+F10 keyboard route */
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).focus();
        menu.open(e.clientX, e.clientY, buildMenuItems(), 'track');
      }}
      onKeyDown={(e) => {
        /* fires for focus on the header itself OR any of its M/S/L buttons
           (keydown bubbles to this host) */
        if (!isMenuKey(e)) return;
        e.preventDefault();
        e.stopPropagation();
        menu.openForElement(e.currentTarget as HTMLElement, buildMenuItems(), 'track');
      }}
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
      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}

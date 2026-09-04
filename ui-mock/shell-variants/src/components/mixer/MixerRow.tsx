/* MixerRow — the three-state mixer surface under the timeline (design doc §4):
   collapsed (0px) / meter-bridge (~32px, per-track badge+name+meter+M/S/L
   chips + master mini-cluster) / full (~176px, auto-compact ~120px when
   viewport height < ~850px). One strip per audio track + aux returns +
   master — the spec 20 §4.2 G/E model made visible. F6-region: the row
   joins the focus cycle as the 7th region (registered as a §10 seal item). */

import { useEffect, useState } from 'react';
import { AudioLines } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { dbLabel } from '../../state/mockMixer';
import { ChannelStrip, AuxStrip, MasterStrip } from './ChannelStrip';
import { StripMeter } from './MixerPrimitives';

// single source of truth: the undoable store command (headers, strips, bridge)
const toggleTrack = (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked') =>
  useUi.getState().toggleTrackCmd(sceneId, trackId, field);

/* ---------- meter bridge (32px) ---------- */
function Bridge() {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const mixer = useUi((s) => s.mixer);
  const setStripFocus = useUi((s) => s.setStripFocus);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');

  return (
    <div className="flex h-full items-stretch gap-0 overflow-x-auto border-t border-hairline bg-shell px-1" data-testid="mixer-row-bridge">
      {audio.map((t) => {
        const strip = mixer.tracks[t.id];
        return (
          <div key={t.id} className="flex shrink-0 items-center gap-1.5 border-r border-hairline px-1.5" data-testid={`bridge-${t.badge}`}>
            <span className="mono text-[10px] font-semibold text-[var(--type-audio)]">{t.badge}</span>
            <span className="w-[54px] truncate text-[10px] text-tmuted">{t.name}</span>
            <StripMeter trackId={t.id} db={strip?.fader ?? -6} height={14} width={5} duckAmount={mixer.ducking[t.id]?.amount ?? 0} label={t.name} />
            {(['muted', 'solo', 'locked'] as const).map((f) => (
              <button key={f} onClick={() => toggleTrack(scene.id, t.id, f)} aria-pressed={t[f]} aria-label={`${f} ${t.name}`}
                className={`mono flex h-[14px] w-[14px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${t[f] ? (f === 'muted' ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : f === 'solo' ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-accent bg-accent/20 text-accent') : 'border-strong bg-inset text-tmuted'}`}>
                {f === 'muted' ? 'M' : f === 'solo' ? 'S' : 'L'}
              </button>
            ))}
          </div>
        );
      })}
      {/* master mini-cluster — same store values as the toolbar master (§4.5) */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 border-l border-hairline px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-tprimary">Master</span>
        <BridgeMasterMeter />
        <BridgeMasterMute />
        <BridgeMasterVol />
        <button
          className="mono flex h-[14px] w-[14px] items-center justify-center rounded-[2px] border text-[10px] font-bold"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
          onClick={() => useUi.getState().setMixerState('full')}
          aria-label="Expand mixer to full"
          data-tip="Expand mixer"
        >
          <AudioLines size={10} strokeWidth={1.6} />
        </button>
        <button
          onClick={() => cycleMixerState()}
          className="rounded-[2px] px-1 text-[10px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
          aria-label="Collapse mixer row"
        >
          collapse
        </button>
      </div>
    </div>
  );
}

/* bridge master mute + volume — synced with toolbar master (§4.5) */
function BridgeMasterMute() {
  const muted = useUi((s) => s.masterMuted);
  const toggle = useUi((s) => s.toggleMasterMute);
  return (
    <button onClick={toggle} aria-pressed={muted} aria-label="Master mute"
      className={`mono flex h-[14px] w-[14px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${muted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}>M</button>
  );
}
function BridgeMasterVol() {
  const vol = useUi((s) => s.masterVolume);
  const setVol = useUi((s) => s.setMasterVolume);
  return (
    <input type="range" min={0} max={100} value={Math.round(vol * 100)} onChange={(e) => setVol(+e.target.value / 100)}
      className="green-fill h-[10px] w-[54px]" style={{ ['--fill' as any]: `${Math.round(vol * 100)}%` }} aria-label="Master volume" />
  );
}

/* reactive bridge master meter (not getState-in-render) */
function BridgeMasterMeter() {
  const muted = useUi((s) => s.masterMuted);
  const vol = useUi((s) => s.masterVolume);
  return <StripMeter trackId="master-bridge" db={muted ? -60 : vol * 66 - 60} height={14} width={5} label="Master" />;
}

/* ---------- full strip row ---------- */
function FullRow({ compact }: { compact: boolean }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const stripFocus = useUi((s) => s.stripFocus);
  const stripFlash = useUi((s) => s.stripFlash);
  const setStripFocus = useUi((s) => s.setStripFocus);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const [flashOn, setFlashOn] = useState(false);

  // strip-focus flash (escalation gesture feedback) — 1.2s ring
  useEffect(() => {
    if (!stripFlash) return;
    setFlashOn(true);
    const t = setTimeout(() => setFlashOn(false), 1200);
    return () => clearTimeout(t);
  }, [stripFlash]);

  return (
    <div className="flex h-full min-h-0 items-stretch overflow-x-auto border-t border-hairline bg-shell" data-testid="mixer-row-full">
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-r border-hairline px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">Mixer</span>
        <span className="mono text-[10px] text-tfaint">G-layer</span>
        <button onClick={() => cycleMixerState()} className="rounded-[2px] px-1 text-[10px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary" aria-label="Collapse mixer row">collapse</button>
      </div>
      {audio.map((t) => (
        <ChannelStrip key={t.id} track={t} sceneId={scene.id} compact={compact}
          focused={stripFocus === t.id}
          flashing={flashOn && stripFocus === t.id}
          onStripClick={() => setStripFocus(t.id)} />
      ))}
      <AuxStrip bus="a1" compact={compact} />
      <AuxStrip bus="a2" compact={compact} />
      <MasterStrip compact={compact} />
    </div>
  );
}

/* ---------- the 3-state container ---------- */
export function MixerRow() {
  const mixerState = useUi((s) => s.mixerState);
  const [tall, setTall] = useState(true);

  useEffect(() => {
    const onResize = () => setTall(window.innerHeight >= 850);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (mixerState === 'collapsed') return null;

  const height = mixerState === 'bridge' ? 32 : tall ? 176 : 120;
  return (
    <div
      className="flex shrink-0"
      style={{ height, minHeight: height }}
      data-testid="mixer-row"
      role="region"
      aria-label="Audio mixer"
    >
      {mixerState === 'bridge' ? <Bridge /> : <FullRow compact={!tall} />}
    </div>
  );
}

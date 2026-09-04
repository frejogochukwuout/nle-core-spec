/* ChannelStrip — one mixer strip per audio track (spec 20 §4.2 G-layer
   projection), redesigned for the SIDE DOCK (design doc v2.2): strips are
   tall console columns beside the multi-track lanes, not crammed into a
   176px bottom row. Column order: badge+name header → role chip →
   [fill-height meter | dB fader] → pan → M/S/L (same toggles/commands as
   track headers) → 2 insert slots → aux sends (A1/A2 + pre/post) → output
   bus select → Duck-under row on BGM/Music-role strips (the spec 20 §12.2
   sidechain-UX answer, mock). Aux return strips + MASTER strip live here
   too (MixerDock composes them). */

import { useUi } from '../../state/useUiStore';
import { dbLabel, ROLE_LABEL, type Role, type MixerTrackSettings } from '../../state/mockMixer';

const DEFAULT_STRIP: MixerTrackSettings = { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 };
import type { TrackJSON } from '../../lib/mockData';

const EMPTY_TRACKS: TrackJSON[] = [];
import { Fader, PanKnob, StripMeter } from './MixerPrimitives';

// single source of truth: the undoable store command (headers, strips, bridge)
const toggleTrack = (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked') =>
  useUi.getState().toggleTrackCmd(sceneId, trackId, field);

function InsertSlot({ value, onPick, slot }: { value: string | null; onPick: (v: string | null) => void; slot: number }) {
  return (
    <select
      aria-label={`Insert slot ${slot}`}
      className="field w-full cursor-pointer px-1 py-0 text-[10px]"
      value={value ?? ''}
      onChange={(e) => onPick(e.target.value || null)}
    >
      <option value="">—</option>
      <option value="EQ">EQ</option>
      <option value="Comp">Comp</option>
      <option value="Gate">Gate</option>
      <option value="De-esser">De-esser</option>
    </select>
  );
}

export function ChannelStrip({ track, sceneId, compact, focused, flashing, onStripClick }: {
  track: TrackJSON; sceneId: string; compact: boolean; focused: boolean; flashing?: boolean; onStripClick: () => void;
}) {
  // stable-ref selectors only (zustand v5: unstable selector results loop useSyncExternalStore)
  const mixer = useUi((s) => s.mixer);
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId));
  const strip = mixer.tracks[track.id] ?? DEFAULT_STRIP;
  const role = mixer.roles[track.id] as Role | undefined;
  const duck = mixer.ducking[track.id];
  const buses = mixer.buses;
  const audioTracks = (scene?.tracks ?? EMPTY_TRACKS).filter((t) => t.kind === 'audio');
  const setMixerTrack = useUi((s) => s.setMixerTrack);
  const setDucking = useUi((s) => s.setDucking);

  const badgeCls = 'border-[var(--type-audio)] text-[var(--type-audio)]';

  return (
    <div
      data-flash={flashing ? 'on' : undefined}
      className={`mixer-strip flex shrink-0 flex-col items-center gap-1 border-r border-hairline px-1.5 pb-1.5 pt-1 ${focused ? 'bg-[color-mix(in_srgb,var(--accent-selection)_12%,var(--bg-shell)))] ring-1 ring-[var(--accent-selection)]' : 'bg-shell hover:bg-[var(--hover-overlay)]'}`}
      style={{ width: compact ? 84 : 108 }}
      data-testid={`mixer-strip-${track.badge}`}
      onClick={onStripClick}
      role="group"
      aria-label={`${track.name} channel strip`}
    >
      {/* header: badge + name */}
      <div className="flex w-full shrink-0 items-center gap-1">
        <span className={`mono flex h-[16px] w-[24px] shrink-0 items-center justify-center rounded-[2px] border text-[10px] font-semibold ${badgeCls}`}>
          {track.badge}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10px] text-tprimary">{track.name}</span>
      </div>
      {role && (
        <span className="w-full shrink-0 rounded-[2px] border border-hairline bg-inset py-px text-center text-[10px] font-semibold uppercase tracking-wide text-tmuted">
          {ROLE_LABEL[role]}
        </span>
      )}

      {/* the centerpiece: fill-height meter beside a tall dB fader — the
          dock's height IS the fader room (this is why the mixer moved out
          of the 176px bottom row) */}
      <div className="flex min-h-[110px] w-full shrink-0 items-stretch justify-center gap-1.5 py-1">
        <StripMeter
          trackId={track.id}
          db={strip.fader}
          duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
          fillHeight
          label={track.name}
        />
        <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} fillHeight ariaLabel={`${track.name} fader`} />
      </div>

      {/* pan below the fader — DAW floor 24px in the full dock, 22 when the
          dock squeezes to compact (R15-A1) */}
      <div className="flex shrink-0 justify-center">
        <PanKnob pan={strip.pan} onChange={(pan) => setMixerTrack(track.id, { pan })} size={compact ? 22 : 24} ariaLabel={`${track.name} pan`} />
      </div>

      {/* M/S/L — same commands as the track header (one source of truth) */}
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => toggleTrack(sceneId, track.id, 'muted')} aria-pressed={track.muted} aria-label={`Mute ${track.name}`}
          className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${track.muted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}>M</button>
        <button onClick={() => toggleTrack(sceneId, track.id, 'solo')} aria-pressed={track.solo} aria-label={`Solo ${track.name}`}
          className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${track.solo ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-strong bg-inset text-tmuted'}`}>S</button>
        <button onClick={() => toggleTrack(sceneId, track.id, 'locked')} aria-pressed={track.locked} aria-label={`Lock ${track.name}`}
          className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${track.locked ? 'border-accent bg-accent/20 text-accent' : 'border-strong bg-inset text-tmuted'}`}>L</button>
      </div>

      {/* lower stack: inserts + sends + bus + ducking (scrolls only if the
          dock is squeezed hard by the main-body drag) */}
      <div className="scroll-y flex w-full min-h-0 flex-1 flex-col gap-1">
        {!compact && (
          <>
            {/* inserts */}
            <div className="flex w-full flex-col gap-0.5">
              <InsertSlot slot={1} value={strip.inserts[0]} onPick={(v) => setMixerTrack(track.id, { inserts: [v, strip.inserts[1]] })} />
              <InsertSlot slot={2} value={strip.inserts[1]} onPick={(v) => setMixerTrack(track.id, { inserts: [strip.inserts[0], v] })} />
            </div>

            {/* aux sends: A1/A2 twins — auxB was model-present but
                display-missing (R14; spec 20 §4.2 MixerTrackSettings.auxB) */}
            <div className="flex w-full items-center gap-1 text-[10px] text-tmuted">
              <span className="mono shrink-0">A1</span>
              <input type="range" min={0} max={1} step={0.05} value={strip.auxA} className="h-[10px] min-w-0 flex-1 green-fill"
                style={{ ['--fill' as any]: `${strip.auxA * 100}%` }}
                onChange={(e) => setMixerTrack(track.id, { auxA: +e.target.value })}
                aria-label={`${track.name} aux 1 send`} />
            </div>
            <div className="flex w-full items-center gap-1 text-[10px] text-tmuted">
              <span className="mono shrink-0">A2</span>
              <input type="range" min={0} max={1} step={0.05} value={strip.auxB} className="h-[10px] min-w-0 flex-1 green-fill"
                style={{ ['--fill' as any]: `${strip.auxB * 100}%` }}
                onChange={(e) => setMixerTrack(track.id, { auxB: +e.target.value })}
                aria-label={`${track.name} aux 2 send`} />
            </div>
            {/* tap point: ONE shared pre/post field per track (spec 20 §4.2
                auxPreFader) — real toggle via setMixerTrack, was a static
                display-only label (R14) */}
            <button
              onClick={() => setMixerTrack(track.id, { auxPreFader: !strip.auxPreFader })}
              aria-pressed={strip.auxPreFader}
              aria-label="Aux send pre-fader"
              data-tip={`Aux tap point — ${strip.auxPreFader ? 'pre' : 'post'} fader`}
              className={`mono flex h-[14px] w-full shrink-0 items-center justify-center rounded-[2px] border text-[9px] font-bold ${strip.auxPreFader ? 'border-accent bg-accent/20 text-accent' : 'border-strong bg-inset text-tmuted'}`}
            >
              {strip.auxPreFader ? 'pre' : 'post'}
            </button>
            <select aria-label={`${track.name} output bus`} className="field w-full cursor-pointer px-1 py-0 text-[10px]"
              value={strip.outputBus} onChange={(e) => setMixerTrack(track.id, { outputBus: +e.target.value as 0 | 1 | 2 })}>
              <option value={0}>→ Master</option>
              <option value={1}>→ A1 {buses.a1.name}</option>
              <option value={2}>→ A2 {buses.a2.name}</option>
            </select>
          </>
        )}

        {/* duck-under row (bgm/music roles) — spec 20 §12.2 answer, mock */}
        {!compact && duck && (
          <div className="flex w-full flex-col gap-0.5 rounded-[2px] border border-hairline bg-inset px-1 py-1" data-testid={`mixer-ducking-${track.badge}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-tmuted">Duck under</span>
            <select aria-label={`${track.name} ducking source`} className="field w-full cursor-pointer px-1 py-0 text-[10px]"
              value={duck.source ?? ''} onChange={(e) => setDucking(track.id, { source: e.target.value || null })}>
              <option value="">—</option>
              {audioTracks.filter((t) => t.id !== track.id).map((t) => <option key={t.id} value={t.id}>{t.badge} {t.name}</option>)}
            </select>
            <div className="flex items-center gap-1 text-[10px] text-tmuted">
              <span className="mono shrink-0">amt</span>
              <input type="range" min={0} max={1} step={0.05} value={duck.amount} className="h-[10px] min-w-0 flex-1"
                onChange={(e) => setDucking(track.id, { amount: +e.target.value })} aria-label={`${track.name} ducking amount`} />
              <span className="mono shrink-0">{Math.round(duck.amount * 100)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-tmuted">
              <span className="mono">atk {duck.attack}ms</span>
              <span className="mono">rel {duck.release}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- aux return strip ---------- */
export function AuxStrip({ bus, compact }: { bus: 'a1' | 'a2'; compact: boolean }) {
  const settings = useUi((s) => s.mixer.buses[bus]);
  const setAuxBus = useUi((s) => s.setAuxBus);
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 border-r border-hairline bg-inset px-1.5 pb-1.5 pt-1" style={{ width: compact ? 72 : 88 }}
      role="group" aria-label={`Aux ${bus} return strip`} data-testid={`mixer-strip-aux-${bus}`}>
      <span className="mono text-[10px] font-semibold text-tmuted">A{bus === 'a1' ? '1' : '2'}</span>
      <span className="w-full truncate text-center text-[10px] text-tprimary">{settings.name}</span>
      <div className="flex min-h-[110px] w-full shrink-0 items-stretch justify-center gap-1.5 py-1">
        {/* R15-A2: ONE engine key per bus — 'auxA'/'auxB' (unified registry) */}
        {!compact && <StripMeter trackId={bus === 'a1' ? 'auxA' : 'auxB'} db={settings.returnGain} fillHeight label={`Aux ${bus}`} />}
        <Fader db={settings.returnGain} onChange={(db) => setAuxBus(bus, { returnGain: db })} fillHeight ariaLabel={`Aux ${bus} return`} />
      </div>
      {/* bus output enable — spec 20 §4.2 AuxBusSettings.on: real toggle via
          setAuxBus, was a static ON badge (R14) */}
      <button
        onClick={() => setAuxBus(bus, { on: !settings.on })}
        aria-pressed={settings.on}
        aria-label={`Aux ${bus} bus on`}
        data-tip="Aux bus output enable"
        className={`mono rounded-[2px] border px-1.5 py-px text-[10px] font-bold ${settings.on ? 'border-[var(--solo)] text-[var(--solo)]' : 'border-strong text-tmuted'}`}
      >
        {settings.on ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

/* ---------- master strip — the SAME store values as timeline-toolbar
    master mute/volume (18 §4.5 "master bus gain", mock-level) ---------- */
export function MasterStrip({ compact }: { compact: boolean }) {
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const setMasterVolume = useUi((s) => s.setMasterVolume);
  const db = masterMuted ? -60 : Math.round((masterVolume * 66 - 60) * 10) / 10;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 px-1.5 pb-1.5 pt-1" style={{ width: compact ? 84 : 100 }}
      role="group" aria-label="Master strip" data-testid="mixer-strip-master">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-tprimary">Master</span>
      <div className="flex min-h-[110px] w-full shrink-0 items-stretch justify-center gap-1.5 py-1">
        {!compact && <StripMeter trackId="master" db={db} fillHeight label="Master" />}
        <Fader db={db} onChange={(ndb) => setMasterVolume(Math.max(0, Math.min(1, (ndb + 60) / 66)))} fillHeight ariaLabel="Master fader" />
      </div>
      <button onClick={toggleMasterMute} aria-pressed={masterMuted} aria-label="Master mute"
        className={`mono flex h-[16px] w-[24px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${masterMuted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}>M</button>
      {!compact && <span className="mono text-[10px] text-tfaint">LUFS — v2</span>}
    </div>
  );
}

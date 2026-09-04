/* ChannelStrip — one mixer strip per audio track (spec 20 §4.2 G-layer
   projection), redesigned for the SIDE DOCK (design doc v2.2): strips are
   tall console columns beside the multi-track lanes, not crammed into a
   176px bottom row. Column order: badge+name header → role chip →
   [fill-height meter | dB fader + true-position scale column] → readout row
   (fader dB + live peak) → pan → M/S/L (same toggles/commands as track
   headers) → 2 insert slots → aux sends (A1/A2 + pre/post) → output bus
   select → Duck-under row on BGM/Music-role strips (spec 20 §12.2
   sidechain-UX answer, mock). Aux return strips + MASTER strip live here
   too (MixerDock composes them).
   R15-A4 strip chrome: h-1 role-color base bar (--mk-role-*) at every strip
   bottom (master = accent gradient, aux = type-audio), --border-strong
   hairlines between sections, subtle bg parity across the strip row,
   M/S/L normalized to 20×18 letter buttons, aux "no source" honest-disabled
   state. R15-A3: fader scale column + readout row (mono tabular-nums,
   signed 1dp, −∞ guards). */

import { useUi } from '../../state/useUiStore';
import { dbLabel, ROLE_LABEL, type Role, type MixerTrackSettings } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';

const DEFAULT_STRIP: MixerTrackSettings = { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 };
import type { TrackJSON } from '../../lib/mockData';

const EMPTY_TRACKS: TrackJSON[] = [];
import { Fader, PanKnob, StripMeter } from './MixerPrimitives';

// single source of truth: the undoable store command (headers, strips, bridge)
const toggleTrack = (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked') =>
  useUi.getState().toggleTrackCmd(sceneId, trackId, field);

/* ---------- A4 strip-chrome atoms (token-only) ---------- */

/** section hairline — --border-strong, decorative */
const Hairline = () => <div className="h-px w-full shrink-0 bg-strong" aria-hidden="true" />;

/** h-1 base bar pinned to the strip's bottom edge (role color / accent
    gradient / type-audio) — the strip's at-a-glance identity, absolute so it
    sits flush with the bottom border and never competes for layout */
const BaseBar = ({ testId, background }: { testId: string; background: string }) => (
  <div data-testid={testId} className="absolute inset-x-0 bottom-0 h-1" style={{ background }} aria-hidden="true" />
);

/** role → --mk-role-* base-bar color (A0 single ramp set, light overrides) */
const ROLE_BAR: Record<Role, string> = {
  dialogue: 'var(--mk-role-dialogue)',
  bgm: 'var(--mk-role-bgm)',
  sfx: 'var(--mk-role-sfx)',
  music: 'var(--mk-role-music)',
};

/** A3 readout row — fader dB (dbLabel: signed 1dp, −∞ guard) + live peak dB
    in the meter-green token. mono/tabular-nums via the .mono class. */
const peakLabel = (peakDb: number) => (peakDb <= -60 ? '−∞' : `${peakDb > 0 ? '+' : ''}${peakDb.toFixed(1)}`);

function StripReadout({ faderDb, peakDb, testId }: { faderDb: number; peakDb: number; testId: string }) {
  return (
    <div data-testid={testId} className="mono flex w-full shrink-0 items-baseline justify-center gap-1.5 text-[9px] leading-none">
      <span className="text-tmuted">{dbLabel(faderDb)}</span>
      <span className="text-[var(--meter-green)]">{peakLabel(peakDb)}</span>
    </div>
  );
}

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

export function ChannelStrip({ track, sceneId, compact, focused, flashing, index = 0, onStripClick }: {
  track: TrackJSON; sceneId: string; compact: boolean; focused: boolean; flashing?: boolean;
  /** strip position in the dock row — drives the subtle bg parity (A4) */
  index?: number;
  onStripClick: () => void;
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

  // the strip's own view of the shared engine — the peak readout under the
  // fader (same key as StripMeter; one engine, N views)
  const meter = useMeter(track.id);
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);

  const badgeCls = 'border-[var(--type-audio)] text-[var(--type-audio)]';
  // subtle alternating row parity (A4) — raised on odd strips, shell on even
  const parityBg = index % 2 === 1 ? 'bg-raised' : 'bg-shell';

  return (
    <div
      data-flash={flashing ? 'on' : undefined}
      className={`mixer-strip relative flex shrink-0 flex-col items-center gap-1 border-r border-hairline px-1.5 pb-1.5 pt-1 ${focused ? 'bg-[color-mix(in_srgb,var(--accent-selection)_12%,var(--bg-shell)))] ring-1 ring-[var(--accent-selection)]' : `${parityBg} hover:bg-[var(--hover-overlay)]`}`}
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
      <Hairline />

      {/* the centerpiece: fill-height meter beside a tall dB fader — the
          dock's height IS the fader room (this is why the mixer moved out
          of the 176px bottom row). A3: the fader carries its dB scale
          column (true taper positions) between it and the meter */}
      <div className="flex min-h-[110px] w-full shrink-0 items-stretch justify-center gap-1.5 py-1">
        <StripMeter
          trackId={track.id}
          db={strip.fader}
          duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
          fillHeight
          label={track.name}
        />
        <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} fillHeight scale ariaLabel={`${track.name} fader`} />
      </div>

      {/* A3 readout row: fader dB + live peak (engine view, same key) */}
      <StripReadout faderDb={strip.fader} peakDb={peak} testId={`mixer-readout-${track.badge}`} />
      <Hairline />

      {/* pan below the fader — DAW floor 24px in the full dock, 22 when the
          dock squeezes to compact (R15-A1) */}
      <div className="flex shrink-0 justify-center">
        <PanKnob pan={strip.pan} onChange={(pan) => setMixerTrack(track.id, { pan })} size={compact ? 22 : 24} ariaLabel={`${track.name} pan`} />
      </div>

      {/* M/S/L — same commands as the track header (one source of truth);
          A4: normalized 20×18 letter buttons, semantic on-state tokens */}
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => toggleTrack(sceneId, track.id, 'muted')} aria-pressed={track.muted} aria-label={`Mute ${track.name}`}
          className={`mono flex h-[18px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${track.muted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}>M</button>
        <button onClick={() => toggleTrack(sceneId, track.id, 'solo')} aria-pressed={track.solo} aria-label={`Solo ${track.name}`}
          className={`mono flex h-[18px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${track.solo ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-strong bg-inset text-tmuted'}`}>S</button>
        <button onClick={() => toggleTrack(sceneId, track.id, 'locked')} aria-pressed={track.locked} aria-label={`Lock ${track.name}`}
          className={`mono flex h-[18px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${track.locked ? 'border-accent bg-accent/20 text-accent' : 'border-strong bg-inset text-tmuted'}`}>L</button>
      </div>
      {!compact && <Hairline />}

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

      {/* A4: role-color base bar, flush to the strip's bottom edge */}
      <BaseBar testId={`mixer-basebar-${track.badge}`} background={role ? ROLE_BAR[role] : 'var(--type-audio)'} />
    </div>
  );
}

/* ---------- aux return strip ---------- */
export function AuxStrip({ bus, compact }: { bus: 'a1' | 'a2'; compact: boolean }) {
  const settings = useUi((s) => s.mixer.buses[bus]);
  const setAuxBus = useUi((s) => s.setAuxBus);
  const key = bus === 'a1' ? 'auxA' : 'auxB';
  // the strip's engine view for the peak readout (ONE key per bus, R15-A2)
  const meter = useMeter(key);
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);
  // honest "no source": nothing feeds the bus — no send level > 0 and no
  // outputBus route to it (the engine is already silent for it; this chip
  // is the visual half of that honesty). Boolean selector → stable identity.
  const hasSource = useUi((s) => {
    const scene = s.scenes.find((x) => x.id === s.activeSceneId);
    if (!scene) return false;
    const busIdx = bus === 'a1' ? 1 : 2;
    return scene.tracks.some((t) => {
      if (t.kind !== 'audio') return false;
      const strip = s.mixer.tracks[t.id];
      if (!strip) return false;
      if (strip.outputBus === busIdx) return true;
      return bus === 'a1' ? strip.auxA > 0 : strip.auxB > 0;
    });
  });

  return (
    <div className="relative flex shrink-0 flex-col items-center gap-1 border-r border-hairline bg-inset px-1.5 pb-1.5 pt-1" style={{ width: compact ? 72 : 88 }}
      role="group" aria-label={`Aux ${bus} return strip`} data-testid={`mixer-strip-aux-${bus}`}>
      <span className="mono text-[10px] font-semibold text-tmuted">A{bus === 'a1' ? '1' : '2'}</span>
      <span className="w-full truncate text-center text-[10px] text-tprimary">{settings.name}</span>
      {/* no-source state: honest-disabled chip (aria-disabled + dashed border
          + data-tip — the codebase's mock-unavailable idiom; controls stay
          live because they write real store state) */}
      {!hasSource && (
        <span
          aria-disabled="true"
          data-tip="No track sends or routes feed this bus"
          data-testid={`mixer-nosource-${bus}`}
          className="w-full shrink-0 select-none rounded-[2px] border border-dashed border-strong text-center text-[9px] uppercase leading-4 tracking-wide text-tfaint"
        >
          no source
        </span>
      )}
      <Hairline />
      <div className="flex min-h-[110px] w-full shrink-0 items-stretch justify-center gap-1.5 py-1">
        {/* R15-A2: ONE engine key per bus — 'auxA'/'auxB' (unified registry) */}
        {!compact && <StripMeter trackId={key} db={settings.returnGain} fillHeight label={`Aux ${bus}`} />}
        <Fader db={settings.returnGain} onChange={(db) => setAuxBus(bus, { returnGain: db })} fillHeight ariaLabel={`Aux ${bus} return`} />
      </div>
      {/* A3 readout row: return gain + live peak */}
      <StripReadout faderDb={settings.returnGain} peakDb={peak} testId={`mixer-readout-aux-${bus}`} />
      <Hairline />
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
      {/* A4: aux base bar — the audio-type token (returns are audio-utility
          surfaces; the --mk-role-* ramp is reserved for the four roles) */}
      <BaseBar testId={`mixer-basebar-aux-${bus}`} background="var(--type-audio)" />
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
  // engine view for the peak readout (ONE 'master' key — R15-A2 unification)
  const meter = useMeter('master');
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);
  return (
    <div className="relative flex shrink-0 flex-col items-center gap-1 px-1.5 pb-1.5 pt-1" style={{ width: compact ? 84 : 100 }}
      role="group" aria-label="Master strip" data-testid="mixer-strip-master">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-tprimary">Master</span>
      <Hairline />
      <div className="flex min-h-[110px] w-full shrink-0 items-stretch justify-center gap-1.5 py-1">
        {!compact && <StripMeter trackId="master" db={db} fillHeight label="Master" />}
        {/* A4: accent-tinted cap (--fader-cap-accent-1/2, flat — no glow) */}
        <Fader db={db} onChange={(ndb) => setMasterVolume(Math.max(0, Math.min(1, (ndb + 60) / 66)))} fillHeight accent ariaLabel="Master fader" />
      </div>
      {/* A3 readout row: master dB (−∞ guard via dbLabel when volume ≤ −60
          or muted) + live peak */}
      <StripReadout faderDb={db} peakDb={peak} testId="mixer-readout-master" />
      <Hairline />
      <button onClick={toggleMasterMute} aria-pressed={masterMuted} aria-label="Master mute"
        className={`mono flex h-[18px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${masterMuted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}>M</button>
      {!compact && <span className="mono text-[10px] text-tfaint">LUFS — v2</span>}
      {/* A4: master base bar — the accent gradient (flat, token pair) */}
      <BaseBar testId="mixer-basebar-master" background="linear-gradient(90deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))" />
    </div>
  );
}

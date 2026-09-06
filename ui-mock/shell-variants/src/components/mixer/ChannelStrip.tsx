/* ChannelStrip — one mixer strip per audio track (spec 20 §4.2 G-layer
   projection), REBUILT R19-B1 to the Fairlight reference anatomy
   (audio_mixer.html — r19-analysis/audio-cluster.md §2.4/§3.2):

   3px role-color TOP bar → badge+name header → "No Input" row → FX chip
   rack (gold chips = the 2 REAL MixerTrackSettings.inserts slots + "+"
   add-slot chips, honest insert-browser toast) + gold "I" 16×16 power
   button (display state, gap C40) → EQ/dynamics graph thumbnails
   (deterministic per trackId) → role label (gold for music) → R/S/M row
   (R record-arm display-only, gap C40; S/M real toggleTrackCmd) → 48px pan
   crosshair box → the TERMINAL flex-1 fader section: one SHARED 24px
   headroom readout + [meter | fader+scale] equal-height columns.

   Fixes: th_mto617w1 (meter was w-full, squeezed the fader), th_mto37ze9 /
   th_mto6496s (the fader block is now the terminal flex-1 section — the
   accessory rows are fixed and sit ABOVE it; nothing sits below the
   fader), th_mtoyq7jt (meter / scale / groove exactly equal height,
   top-aligned under one headroom strip).

   Aux return strips + the master strip live here too (MixerDock composes
   them; master = same anatomy minus pan box, accent top bar, M-only RSM
   per reference M1). Aux sends / pre-post / output bus / ducking editing
   moved to the ChannelEditor rail — the reference strip has no sends
   surface and the terminal fader needs the room (R19-B1 report note). */

import { useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { ROLE_LABEL, type Role, type MixerTrackSettings } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';

const DEFAULT_STRIP: MixerTrackSettings = { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 };
import type { TrackJSON } from '../../lib/mockData';

import { Fader, PanBox, StripMeter, HeadroomReadout } from './MixerPrimitives';
import { EqThumb, DynThumb } from './StripGraphs';

// single source of truth: the undoable store command (headers, strips, bridge)
const toggleTrack = (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked') =>
  useUi.getState().toggleTrackCmd(sceneId, trackId, field);

/* ---------- strip-chrome atoms (token-only) ---------- */

/** section hairline — --border-strong, decorative */
const Hairline = () => <div className="h-px w-full shrink-0 bg-strong" aria-hidden="true" />;

/** 3px role-color top bar pinned to the strip's top edge (reference §2.4
    row 1: the strip's at-a-glance identity; master = accent gradient) —
    replaces the old h-1 BOTTOM base bar (R19-B1 fidelity pick: top) */
const TopBar = ({ testId, background }: { testId: string; background: string }) => (
  <div data-testid={testId} className="h-[3px] w-full shrink-0" style={{ background }} aria-hidden="true" />
);

/** role → --mk-role-* top-bar color (A0 single ramp set, light overrides) */
const ROLE_BAR: Record<Role, string> = {
  dialogue: 'var(--mk-role-dialogue)',
  bgm: 'var(--mk-role-bgm)',
  sfx: 'var(--mk-role-sfx)',
  music: 'var(--mk-role-music)',
};

/* ---------- FX chip rack + "I" power button (reference rows 3–4) ----------
   Gold chips display the REAL inserts (2 slots, spec 20 §4.2); each empty
   slot renders a "+" add chip; clicking an add chip answers honestly —
   the insert browser is a v2 surface (gap C40). The gold "I" 16×16 button
   is the inserts power/bypass: display state + honest toast (no G-surface
   field, gap C40). Insert EDITING stays in the ChannelEditor rail (2 real
   selects through setMixerTrack). */
function FxRack({ inserts, name, pushToast }: {
  inserts: [string | null, string | null]; name: string; pushToast: ReturnType<typeof useUi.getState>['pushToast'];
}) {
  const [power, setPower] = useState(true);
  return (
    <>
      <div data-testid="fx-rack" className="flex w-full shrink-0 flex-col gap-[2px] px-1 pt-1">
        {inserts.map((ins, i) =>
          ins ? (
            <span
              key={i}
              data-testid="fx-chip"
              title={`${ins} insert — edit in the channel editor`}
              className="flex h-[18px] w-full shrink-0 items-center truncate rounded-[2px] border border-strong bg-inset pl-1 text-[10px] font-medium text-[var(--solo)]"
            >
              {ins}
            </span>
          ) : (
            <button
              key={i}
              data-testid="fx-add"
              onClick={() =>
                pushToast({
                  kind: 'info',
                  title: 'Insert browser',
                  detail: 'Browsing/adding insert effects is a v2 surface (gap C40) — the channel editor edits the 2 real slots',
                })
              }
              aria-label={`Add insert ${i + 1}`}
              data-tip="Add insert (browser is v2)"
              className="flex h-[18px] w-full shrink-0 items-center justify-center rounded-[2px] border border-strong bg-inset text-[10px] text-tmuted hover:text-tprimary"
            >
              +
            </button>
          ),
        )}
      </div>
      {/* "I" power row — 26px, centered (reference §2.4 row 4) */}
      <div className="flex h-[26px] w-full shrink-0 items-center justify-center">
        <button
          data-testid="fx-power"
          onClick={() => {
            setPower(!power);
            pushToast({
              kind: 'info',
              title: 'Inserts power',
              detail: 'Insert-chain bypass has no G-surface field yet (gap C40) — display state only',
            });
          }}
          aria-pressed={power}
          aria-label={`${name} inserts power`}
          data-tip="Inserts power (display state, gap C40)"
          className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${
            power ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-[var(--solo)] text-[var(--solo)]'
          }`}
        >
          I
        </button>
      </div>
    </>
  );
}

/* ---------- R/S/M row (reference row 9) ----------
   R = record arm: DISPLAY-ONLY toggle (no G-surface field — gap C40; toggle
   state + honest toast, never a silent no-op). S/M stay REAL — the same
   undoable toggleTrackCmd commands as the track headers. 20×20 letter
   buttons with the reference's inset top highlight. */
function RsmRow({ sceneId, track, name }: { sceneId: string; track: TrackJSON; name: string }) {
  const [armed, setArmed] = useState(false);
  const pushToast = useUi((s) => s.pushToast);
  const btn = 'mono flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
  return (
    <div className="flex h-[24px] w-full shrink-0 items-center justify-center gap-[3px]">
      <button
        data-testid="strip-rec-arm"
        onClick={() => {
          setArmed(!armed);
          pushToast({ kind: 'info', title: 'Record arm', detail: 'Record-arm has no G-surface field yet (gap C40) — display state only' });
        }}
        aria-pressed={armed}
        aria-label={`Record arm ${name}`}
        data-tip="Record arm (display state, gap C40)"
        className={`${btn} ${armed ? 'border-[var(--meter-red)] text-[var(--meter-red)]' : 'border-strong bg-raised text-tmuted'}`}
      >
        R
      </button>
      <button onClick={() => toggleTrack(sceneId, track.id, 'solo')} aria-pressed={track.solo} aria-label={`Solo ${name}`}
        className={`${btn} ${track.solo ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-strong bg-raised text-tmuted'}`}>S</button>
      <button onClick={() => toggleTrack(sceneId, track.id, 'muted')} aria-pressed={track.muted} aria-label={`Mute ${name}`}
        className={`${btn} ${track.muted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-raised text-tmuted'}`}>M</button>
    </div>
  );
}

/* ---------- the TERMINAL fader section (reference §2.5 — the centerpiece) ----------
   One SHARED 24px headroom strip (fader dB signed 1dp no unit + live engine
   peak) above [meter | fader+scale] columns that share one height var —
   EXACTLY equal, top-aligned. The section is the strip's terminal flex-1
   block: it absorbs ALL remaining strip height and nothing sits below the
   fader. fixes th_mto37ze9, th_mto6496s, th_mtoyq7jt */
function FaderSection({ id, db, peakDb, children }: {
  id: string; db: number; peakDb: number; children: React.ReactNode;
}) {
  return (
    <div data-testid={`fader-section-${id}`} className="flex min-h-[124px] w-full flex-1 flex-col">
      <HeadroomReadout db={db} peakDb={peakDb} testId={`mixer-readout-${id}`} />
      <div
        data-testid={`fader-cols-${id}`}
        className="flex min-h-0 flex-1 items-stretch justify-center gap-[3px] px-1 pb-1"
        style={{ '--fader-col-h': '100%' } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

/** equal-height column wrapper — every column of the fader section carries
    the same height var (the shared-style-var equal-height law, th_mtoyq7jt) */
const FaderCol = ({ col, children }: { col: string; children: React.ReactNode }) => (
  <div data-col={col} className="flex min-h-0" style={{ height: 'var(--fader-col-h)' }}>
    {children}
  </div>
);

export function ChannelStrip({ track, sceneId, compact, focused, flashing, index = 0, onStripClick }: {
  track: TrackJSON; sceneId: string; compact: boolean; focused: boolean; flashing?: boolean;
  /** strip position in the dock row — drives the subtle bg parity (A4) */
  index?: number;
  onStripClick: () => void;
}) {
  // stable-ref selectors only (zustand v5: unstable selector results loop useSyncExternalStore)
  const mixer = useUi((s) => s.mixer);
  const strip = mixer.tracks[track.id] ?? DEFAULT_STRIP;
  const role = mixer.roles[track.id] as Role | undefined;
  const duck = mixer.ducking[track.id];
  const setMixerTrack = useUi((s) => s.setMixerTrack);
  const pushToast = useUi((s) => s.pushToast);

  // the strip's own view of the shared engine — the peak readout in the
  // shared headroom (same key as StripMeter; one engine, N views)
  const meter = useMeter(track.id);
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);

  const badgeCls = 'border-[var(--type-audio)] text-[var(--type-audio)]';
  // subtle alternating row parity (A4) — raised on odd strips, shell on even
  const parityBg = index % 2 === 1 ? 'bg-raised' : 'bg-shell';

  return (
    <div
      data-flash={flashing ? 'on' : undefined}
      className={`mixer-strip relative flex h-full min-h-0 shrink-0 flex-col border-r border-hairline ${focused ? 'bg-[color-mix(in_srgb,var(--accent-selection)_12%,var(--bg-shell)))] ring-1 ring-[var(--accent-selection)]' : `${parityBg} hover:bg-[var(--hover-overlay)]`}`}
      style={{ width: compact ? 72 : 86 }}
      data-testid={`mixer-strip-${track.badge}`}
      onClick={onStripClick}
      role="group"
      aria-label={`${track.name} channel strip`}
    >
      {/* 3px role-color top bar (reference row 1) */}
      <TopBar testId={`mixer-topbar-${track.badge}`} background={role ? ROLE_BAR[role] : 'var(--type-audio)'} />

      {/* header: badge + name (task reference anatomy row 2) */}
      <div className="flex h-[24px] w-full shrink-0 items-center gap-1 px-1.5">
        <span className={`mono flex h-[16px] w-[24px] shrink-0 items-center justify-center rounded-[2px] border text-[10px] font-semibold ${badgeCls}`}>
          {track.badge}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-tprimary">{track.name}</span>
      </div>
      <Hairline />

      {/* input label row (reference row 2, 22px) — display state; input
          routing has no G-surface field (gap C40, title documents it) */}
      {!compact && (
        <div
          data-testid="strip-input"
          title="Input routing — no G-surface field (gap C40)"
          className="flex h-[22px] w-full shrink-0 items-center bg-inset pl-1.5 text-[10px] text-tfaint"
        >
          No Input
        </div>
      )}

      {/* FX chip rack + "I" power (reference rows 3–4) */}
      <FxRack inserts={strip.inserts} name={track.name} pushToast={pushToast} />

      {/* EQ + dynamics thumbnails (reference row 5, 2×28px, deterministic) */}
      {!compact && (
        <div data-testid="strip-graphs" className="flex w-full shrink-0 flex-col gap-[2px] px-1 py-1">
          <EqThumb trackKey={track.id} />
          <DynThumb trackKey={track.id} />
        </div>
      )}
      <Hairline />

      {/* track-type role label (reference row 8 title; gold for music) */}
      {role && (
        <div className="flex h-[22px] w-full shrink-0 items-center justify-center overflow-hidden px-1">
          <span
            data-testid="strip-role"
            className={`truncate text-[11px] font-bold tracking-wide ${role === 'music' ? 'text-[var(--solo)]' : 'text-tprimary'}`}
          >
            {ROLE_LABEL[role]}
          </span>
        </div>
      )}

      {/* R/S/M (reference row 9) */}
      <RsmRow sceneId={sceneId} track={track} name={track.name} />
      <Hairline />

      {/* pan crosshair box (reference row 6, 48px + padding = 56px row) —
          our drag/keyboard grammar inside the reference look (PanKnob's
          semantics; mono = 1 dot — no stereo-flag field in the model) */}
      <div className="flex h-[56px] w-full shrink-0 items-center justify-center">
        <PanBox pan={strip.pan} onChange={(pan) => setMixerTrack(track.id, { pan })} ariaLabel={`${track.name} pan`} />
      </div>

      {/* the TERMINAL fader section (reference row 10) — shared headroom +
          equal-height [meter | fader+scale] columns; the meter column is a
          FIXED 14px (th_mto617w1), never w-full */}
      <FaderSection id={track.badge} db={strip.fader} peakDb={peak}>
        <FaderCol col="meter">
          <StripMeter
            trackId={track.id}
            db={strip.fader}
            duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
            fillHeight
            label={track.name}
          />
        </FaderCol>
        <FaderCol col="fader">
          <Fader
            db={strip.fader}
            onChange={(db) => setMixerTrack(track.id, { fader: db })}
            fillHeight
            scale
            headroom={false}
            ariaLabel={`${track.name} fader`}
          />
        </FaderCol>
      </FaderSection>
    </div>
  );
}

/* ---------- aux return strip ----------
   Ours, not in the reference (model-backed, spec 20 §4.2 — deliberate
   divergence, flagged in the R19-B1 report): lean strip with the same
   TERMINAL fader section + shared headroom + equal-height columns. */
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
    <div
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-hairline bg-inset"
      style={{ width: compact ? 72 : 88 }}
      role="group"
      aria-label={`Aux ${bus} return strip`}
      data-testid={`mixer-strip-aux-${bus}`}
    >
      {/* A4 grammar: aux top bar — the audio-type token (returns are
          audio-utility surfaces; the --mk-role-* ramp is reserved for roles) */}
      <TopBar testId={`mixer-topbar-aux-${bus}`} background="var(--type-audio)" />
      <div className="flex h-[24px] w-full shrink-0 items-center gap-1 px-1.5">
        <span className="mono shrink-0 text-[10px] font-semibold text-tmuted">A{bus === 'a1' ? '1' : '2'}</span>
        <span className="min-w-0 flex-1 truncate text-[10px] text-tprimary">{settings.name}</span>
      </div>
      {/* no-source state: honest-disabled chip (aria-disabled + dashed border
          + data-tip — the codebase's mock-unavailable idiom; controls stay
          live because they write real store state) */}
      {!hasSource && (
        <span
          aria-disabled="true"
          data-tip="No track sends or routes feed this bus"
          data-testid={`mixer-nosource-${bus}`}
          className="mx-1 mb-1 w-auto shrink-0 select-none rounded-[2px] border border-dashed border-strong text-center text-[9px] uppercase leading-4 tracking-wide text-tfaint"
        >
          no source
        </span>
      )}
      <Hairline />
      {/* bus output enable — spec 20 §4.2 AuxBusSettings.on: real toggle via
          setAuxBus, was a static ON badge (R14) */}
      <button
        onClick={() => setAuxBus(bus, { on: !settings.on })}
        aria-pressed={settings.on}
        aria-label={`Aux ${bus} bus on`}
        data-tip="Aux bus output enable"
        className={`mono mx-1 my-1 rounded-[2px] border px-1.5 py-px text-[10px] font-bold ${settings.on ? 'border-[var(--solo)] text-[var(--solo)]' : 'border-strong text-tmuted'}`}
      >
        {settings.on ? 'ON' : 'OFF'}
      </button>
      {/* terminal fader section — same law as the channel strips */}
      <FaderSection id={`aux-${bus}`} db={settings.returnGain} peakDb={peak}>
        <FaderCol col="meter">
          {/* R15-A2: ONE engine key per bus — 'auxA'/'auxB' (unified registry) */}
          <StripMeter trackId={key} db={settings.returnGain} fillHeight label={`Aux ${bus}`} />
        </FaderCol>
        <FaderCol col="fader">
          <Fader db={settings.returnGain} onChange={(db) => setAuxBus(bus, { returnGain: db })} fillHeight headroom={false} ariaLabel={`Aux ${bus} return`} />
        </FaderCol>
      </FaderSection>
    </div>
  );
}

/* ---------- master strip (reference M1) ----------
   Same anatomy minus the pan box (spacer keeps the fader tops aligned),
   accent top bar + accent fader cap, M-only RSM (the real store master
   mute — same values as timeline-toolbar, 18 §4.5), input row hidden for
   alignment, FX rack renders as honest add chips (no master insert model). */
export function MasterStrip({ compact }: { compact: boolean }) {
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const setMasterVolume = useUi((s) => s.setMasterVolume);
  const pushToast = useUi((s) => s.pushToast);
  const db = masterMuted ? -60 : Math.round((masterVolume * 66 - 60) * 10) / 10;
  // engine view for the peak readout (ONE 'master' key — R15-A2 unification)
  const meter = useMeter('master');
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);

  return (
    <div
      className="relative flex h-full min-h-0 shrink-0 flex-col"
      style={{ width: compact ? 84 : 96 }}
      role="group"
      aria-label="Master strip"
      data-testid="mixer-strip-master"
    >
      {/* accent top bar (reference M1 has no track color; ours = the master
          accent pair, flat — no glow) */}
      <TopBar testId="mixer-topbar-master" background="linear-gradient(90deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))" />
      <div className="flex h-[24px] w-full shrink-0 items-center justify-center px-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-tprimary">Master</span>
      </div>
      <Hairline />
      {/* input row kept as a hidden spacer (reference M1 alignment) */}
      <div aria-hidden="true" className="h-[22px] w-full shrink-0" />
      <FxRack inserts={[null, null]} name="Master" pushToast={pushToast} />
      {!compact && (
        <div data-testid="strip-graphs" className="flex w-full shrink-0 flex-col gap-[2px] px-1 py-1">
          {/* reference M1's EQ graph is a flat line — deterministic flat */}
          <EqThumb trackKey="master" flat />
          <DynThumb trackKey="master" />
        </div>
      )}
      <Hairline />
      {!compact && <span className="mono px-1 text-center text-[9px] leading-4 text-tfaint">LUFS — v2</span>}
      {/* M only (reference M1) — real store toggle */}
      <div className="flex h-[24px] w-full shrink-0 items-center justify-center">
        <button
          onClick={toggleMasterMute}
          aria-pressed={masterMuted}
          aria-label="Master mute"
          className={`mono flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${masterMuted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-raised text-tmuted'}`}
        >
          M
        </button>
      </div>
      {/* no pan box — spacer keeps the fader tops aligned with channels */}
      <div aria-hidden="true" className="h-[56px] w-full shrink-0" />
      {/* terminal fader section — A4: accent cap (--fader-cap-accent-1/2) */}
      <FaderSection id="master" db={db} peakDb={peak}>
        <FaderCol col="meter">
          <StripMeter trackId="master" db={db} fillHeight label="Master" />
        </FaderCol>
        <FaderCol col="fader">
          <Fader db={db} onChange={(ndb) => setMasterVolume(Math.max(0, Math.min(1, (ndb + 60) / 66)))} fillHeight accent headroom={false} ariaLabel="Master fader" />
        </FaderCol>
      </FaderSection>
    </div>
  );
}

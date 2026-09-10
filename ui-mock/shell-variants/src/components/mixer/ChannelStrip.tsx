/* ChannelStrip — one mixer strip per audio track (spec 20 §4.2 G-layer
   projection), REBUILT R20-W1 to the Fairlight reference anatomy
   (audio_mixer.html — docs/r20/mixer-contract.md §1-§2, DESIGN-R20 D1.2):

   - Uniform 86px strips (aux/master too — D7); column order in the terminal
     fader section is **scale | fader | meter** (D1 — was mirrored).
   - T0 vertical stack (exact heights, contract §1.2): 3px kind-color top bar
     + 25px ID-only header (= the reference's 28px bordered header, D5/D13) →
     input 22 → fx-rack 105 (5 slots: 2 REAL inserts gold + dim empties + the
     last "+" add, D3) → I 26 (16×16 gold) → graphs 66 (EQ 28 + dynamics 28)
     → pan 56 (48×48 box) → routing 24 (16×16 "1"/"2" bus buttons, D4) →
     title 26 (track NAME — gold for music; the header stays ID-only) →
     RSM 24 (20×20 squares) → fader section (flex-1 TERMINAL, nothing below).
   - Cross-strip dB gridlines + the 24px headroom readout live INSIDE the
     pinned fader section (D2/D15).

   Height tiers (D1.3, contract §4.2 revised): the DOCK measures once and
   passes the tier down (cross-strip fader-top alignment requires a SHARED
   tier) — T0 ≥560 full anatomy; T1 420-559 (name merges into the header,
   graphs → ONE combined 28px row, pan box 36, fx-rack 3 slots, no
   routing/title rows); T2 340-419 (graphs + input hidden, fx count chip in
   the header, expandable); T3 280-339 (the accessory stack scrolls INSIDE
   the strip; the trio + RSM pin at the bottom, faderSection = clamp(H−53−
   scrollMin, 164, 260) with scrollMin = max(40, H−53−164)). Below the 280px
   FLOOR the dock auto-falls back to the meters state (MixerDock).

   Width compaction is DECOUPLED from height: `narrow` (72px strips, trio
   drops the meter column) fires when the dock's width budget < N×86.

   Aux returns + master: same 86px width + tier law (our divergence — the
   reference has neither; model-backed per spec 20 §4.2). Master mirrors the
   channel rows with SPACERS (input/I/pan/routing) so the fader tops align
   exactly (contract D11 accepted deviation) and carries the honest LUFS-v2
   note in the routing-spacer row (D12).

   B6: R (record-arm) + I (inserts power) are display state with no
   G-surface field (gap C40) — they now live in STORE view-state flags so
   they survive dock unmounts. S/M stay the undoable toggleTrackCmd. */

import { useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { ROLE_LABEL, type Role, type MixerTrackSettings } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';

const DEFAULT_STRIP: MixerTrackSettings = { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 };
import type { TrackJSON } from '../../lib/mockData';
import type { MixerTier } from './MixerDock';

import { Fader, PanBox, StripMeter, HeadroomReadout, FaderGridlines } from './MixerPrimitives';
import { EqThumb, DynThumb, CombinedThumb } from './StripGraphs';

// single source of truth: the undoable store command (headers, strips, meters)
const toggleTrack = (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked') =>
  useUi.getState().toggleTrackCmd(sceneId, trackId, field);

/* ---------- strip-chrome atoms (token-only) ---------- */

/** section hairline — --border-strong, decorative */
const Hairline = () => <div className="h-px w-full shrink-0 bg-strong" aria-hidden="true" />;

/** 3px kind-color top bar (reference .track-header border-top, §1.2 row 1);
    + the 25px ID row below = the reference's 28px bordered header */
const TopBar = ({ testId, background }: { testId: string; background: string }) => (
  <div data-testid={testId} className="h-[3px] w-full shrink-0" style={{ background }} aria-hidden="true" />
);

/** role → --mk-role-* top-bar color (A0 single ramp set; D14: token law wins
    over the reference's orange/teal/gray family ramp — mapping documented).
    Exported for the meters dock's badge row (same family color). */
export const ROLE_BAR: Record<Role, string> = {
  dialogue: 'var(--mk-role-dialogue)',
  bgm: 'var(--mk-role-bgm)',
  sfx: 'var(--mk-role-sfx)',
  music: 'var(--mk-role-music)',
};

/** 25px header row. T0/T3: track ID ONLY (the NAME lives in the 26px title
    row — D5). T1/T2: ID + name merged up (those tiers drop the title row);
    T2 channels add the expandable fx-count chip. */
function StripHeader({ badge, name, children }: { badge: string; name?: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-[25px] w-full shrink-0 items-center justify-center gap-1 overflow-hidden px-1">
      <span className="mono shrink-0 text-[12px] font-semibold text-tprimary">{badge}</span>
      {name && <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-tprimary" title={name}>{name}</span>}
      {children}
    </div>
  );
}

/* ---------- FX chip rack (reference §1.2 row 3, D3) ----------
   Slots 1-2 = the REAL MixerTrackSettings.inserts (gold text + ellipsis when
   filled, DIM when empty); T0 adds two more dim slots (5-row rack); the LAST
   row is always the reference's "+" add (honest toast — the insert browser is
   a v2 surface, gap C40). Insert EDITING stays in the ChannelEditor rail. */
function FxRack({ inserts, name, slots, pushToast }: {
  inserts: [string | null, string | null]; name: string; slots: 3 | 5;
  pushToast: ReturnType<typeof useUi.getState>['pushToast'];
}) {
  const filled = (ins: string, i: number) => (
    <span
      key={`fx-${i}`}
      data-testid="fx-chip"
      title={`${ins} insert — edit in the channel editor`}
      className="flex h-[18px] w-full shrink-0 items-center truncate rounded-[2px] border border-strong bg-inset pl-1 text-[10px] font-medium text-[var(--solo)]"
    >
      {ins}
    </span>
  );
  const dim = (i: number) => (
    <span
      key={`dim-${i}`}
      data-testid="fx-slot-empty"
      title="Empty insert slot"
      className="h-[18px] w-full shrink-0 rounded-[2px] border border-strong/60 bg-inset/40"
    />
  );
  return (
    <div
      data-testid="fx-rack"
      className="flex w-full shrink-0 flex-col gap-[2px] px-[4px] py-[2px]"
      style={{ height: slots === 5 ? 105 : 62 }}
    >
      {inserts.map((ins, i) => (ins ? filled(ins, i) : dim(i)))}
      {slots === 5 && [dim(2), dim(3)]}
      <button
        data-testid="fx-add"
        onClick={() =>
          pushToast({
            kind: 'info',
            title: 'Insert browser',
            detail: 'Browsing/adding insert effects is a v2 surface (gap C40) — the channel editor edits the 2 real slots',
          })
        }
        aria-label={`Add insert ${name}`}
        data-tip="Add insert (browser is v2)"
        className="flex h-[18px] w-full shrink-0 items-center justify-center rounded-[2px] border border-strong bg-inset text-[10px] font-semibold text-tmuted hover:text-tprimary"
      >
        +
      </button>
    </div>
  );
}

/** T2 fx-count chip (D1.3 "fx-rack → header + count"): shows the real insert
    count and EXPANDS a small popover listing the 2 model slots (edit hint
    stays honest — the ChannelEditor owns the writes). */
function FxCountChip({ inserts, name }: { inserts: [string | null, string | null]; name: string }) {
  const [open, setOpen] = useState(false);
  const count = inserts.filter(Boolean).length;
  return (
    <span className="relative shrink-0">
      <button
        data-testid="fx-count"
        aria-expanded={open}
        aria-label={`${name} insert slots (${count})`}
        data-tip="Insert slots (expand)"
        onClick={() => setOpen(!open)}
        className={`mono rounded-[2px] border px-1 text-[10px] font-bold leading-4 ${open ? 'border-[var(--solo)] text-[var(--solo)]' : 'border-strong text-tmuted'}`}
      >
        FX{count}
      </button>
      {open && (
        <span
          data-testid="fx-count-popover"
          role="group"
          aria-label={`${name} insert slots`}
          className="absolute left-0 top-[26px] z-20 flex w-[78px] flex-col gap-0.5 rounded-[var(--radius-sm)] border border-strong bg-panel p-1 shadow-lg"
        >
          {inserts.map((ins, i) => (
            <span key={i} className={`flex h-[16px] items-center truncate text-[10px] ${ins ? 'font-medium text-[var(--solo)]' : 'text-tfaint'}`}>
              {ins ?? '—'}
            </span>
          ))}
          <span className="border-t border-hairline pt-0.5 text-[10px] leading-tight text-tfaint">edit in the channel editor</span>
        </span>
      )}
    </span>
  );
}

/* ---------- "I" inserts-power row (reference §1.2 row 4) ----------
   16×16 gold-outlined button. B6: the display state lives in the STORE
   (stripInsertsOn) — it survives dock unmounts / state cycles / scene
   switches; the honest gap-C40 toast stays. */
function IRow({ trackId, name }: { trackId: string; name: string }) {
  const on = useUi((s) => s.stripInsertsOn[trackId] ?? true);
  const toggleStripInserts = useUi((s) => s.toggleStripInserts);
  const pushToast = useUi((s) => s.pushToast);
  return (
    <div className="flex h-[26px] w-full shrink-0 items-center justify-center">
      <button
        data-testid="fx-power"
        onClick={() => {
          toggleStripInserts(trackId);
          pushToast({
            kind: 'info',
            title: 'Inserts power',
            detail: 'Insert-chain bypass has no G-surface field yet (gap C40) — display state only',
          });
        }}
        aria-pressed={on}
        aria-label={`${name} inserts power`}
        data-tip="Inserts power (display state, gap C40)"
        className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${
          on ? 'border-[var(--solo)] bg-[var(--solo)] text-black' : 'border-[var(--solo)] text-[var(--solo)]'
        }`}
      >
        I
      </button>
    </div>
  );
}

/* ---------- R/S/M row (reference §1.2 row 9) ----------
   R = record arm: DISPLAY-ONLY toggle (no G-surface field — gap C40; B6: the
   flag lives in the store now). S/M stay REAL — the same undoable
   toggleTrackCmd commands as the track headers. 20×20 letter buttons with
   the reference's inset top highlight. */
function RsmRow({ sceneId, track, name }: { sceneId: string; track: TrackJSON; name: string }) {
  const armed = useUi((s) => s.stripArm[track.id] ?? false);
  const toggleStripArm = useUi((s) => s.toggleStripArm);
  const pushToast = useUi((s) => s.pushToast);
  const btn = 'mono flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border text-[10px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
  return (
    <div className="flex h-[24px] w-full shrink-0 items-center justify-center gap-[3px]">
      <button
        data-testid="strip-rec-arm"
        onClick={() => {
          toggleStripArm(track.id);
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

/** input label row (reference §1.2 row 2, 22px) — display state; input
    routing has no G-surface field (gap C40, title documents it) */
const InputRow = () => (
  <div
    data-testid="strip-input"
    title="Input routing — no G-surface field (gap C40)"
    className="flex h-[22px] w-full shrink-0 items-center bg-inset pl-1.5 text-[10px] text-tfaint"
  >
    No Input
  </div>
);

/** routing row (reference §1.2 row 7, D4): two 16×16 "1"/"2" buttons — REAL
    outputBus writes (1 = aux A1 green, 2 = aux A2 gold per the reference's
    colors); pressing the active bus returns to the master (0). The
    ChannelEditor select stays the full bus editor. */
function RoutingRow({ track, strip, onBus }: { track: TrackJSON; strip: MixerTrackSettings; onBus: (bus: 0 | 1 | 2) => void }) {
  const btn = (bus: 1 | 2, color: string) => {
    const active = strip.outputBus === bus;
    return (
      <button
        data-testid={`strip-bus-${bus}`}
        onClick={() => onBus(active ? 0 : bus)}
        aria-pressed={active}
        aria-label={`Route ${track.name} to aux ${bus}`}
        data-tip={`Output bus: ${strip.outputBus === 0 ? 'master' : `aux ${bus}`} (click to ${active ? 'return to master' : `route to aux ${bus}`})`}
        className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${active ? 'text-black' : ''}`}
        style={{ borderColor: color, background: active ? color : 'transparent', color: active ? '#000' : color }}
      >
        {bus}
      </button>
    );
  };
  return (
    <div className="flex h-[24px] w-full shrink-0 items-center gap-1 pl-1.5">
      {btn(1, 'var(--type-audio)')}
      {btn(2, 'var(--solo)')}
    </div>
  );
}

/** title row (reference §1.2 row 8, D5/D6): the track NAME, 11.5px/700 →
    ours 11px bold; gold for the music role (reference .track-title.gold) */
const TitleRow = ({ name, gold }: { name: string; gold: boolean }) => (
  <div className="flex h-[26px] w-full shrink-0 items-center justify-center overflow-hidden px-1">
    <span data-testid="strip-title" title={name} className={`truncate text-[11px] font-bold tracking-wide ${gold ? 'text-[var(--solo)]' : 'text-tprimary'}`}>
      {name}
    </span>
  </div>
);

/* ---------- the TERMINAL fader section (reference §1.2 row 10/§1.3) ----------
   One SHARED 24px headroom strip (fader dB signed 1dp no unit + live engine
   peak, D15) above the [scale | fader | meter] columns (D1 order) sharing one
   height var — exactly equal, top-aligned — with the cross-strip dB
   gridlines (D2) painted behind them. The section is the strip's TERMINAL
   flex-1 block at T0-T2 (travel floor: section min 164 = 140 travel + the
   24px headroom); at T3 it takes the clamp formula's FIXED height so the
   trio pins at the strip bottom while the accessory stack scrolls above. */
function FaderSection({ id, db, peakDb, pinnedHeight, children }: {
  id: string; db: number; peakDb: number; pinnedHeight?: number; children: React.ReactNode;
}) {
  return (
    <div
      data-testid={`fader-section-${id}`}
      className={`flex w-full flex-col ${pinnedHeight !== undefined ? 'shrink-0' : 'min-h-[164px] flex-1'}`}
      style={pinnedHeight !== undefined ? { height: `${Math.round(pinnedHeight)}px` } : undefined}
    >
      <HeadroomReadout db={db} peakDb={peakDb} testId={`mixer-readout-${id}`} />
      <div
        data-testid={`fader-cols-${id}`}
        className="relative flex min-h-0 flex-1 items-stretch justify-center gap-[3px] px-1 pb-1"
        style={{ '--fader-col-h': '100%' } as React.CSSProperties}
      >
        <FaderGridlines />
        {children}
      </div>
    </div>
  );
}

/** equal-height column wrapper — every column of the fader section carries
    the same height var (the shared-style-var equal-height law, th_mtoyq7jt);
    `relative` keeps the column ABOVE the gridline layer (DOM order) */
const FaderCol = ({ col, children }: { col: string; children: React.ReactNode }) => (
  <div data-col={col} className="relative flex min-h-0" style={{ height: 'var(--fader-col-h)' }}>
    {children}
  </div>
);

/* ---------- T3 scroll math (D1.3 / contract §4.2 — exact) ----------
   Fixed part = top bar 3 + header 25 + hairline 1 + RSM 24 = 53; the scroll
   region floors at max(40, H−53−164) and the fader section takes
   clamp(H−53−scrollMin, 164, 260): the ≥140px travel floor WINS, the scroll
   floor yields to 40px. */
const T3_FIXED = 53;
export function t3FaderLayout(H: number): { faderHeight: number; scrollMin: number } {
  const scrollMin = Math.max(40, H - T3_FIXED - 164);
  const faderHeight = Math.min(260, Math.max(164, H - T3_FIXED - scrollMin));
  return { faderHeight, scrollMin };
}

export function ChannelStrip({ track, sceneId, tier = 0, narrow = false, stripH, focused, flashing, index = 0, onStripClick }: {
  track: TrackJSON; sceneId: string;
  /** height tier (D1.3) — the dock measures once and shares it so fader
      tops align across strips; 0 = full reference anatomy */
  tier?: MixerTier;
  /** width-tier fallback (decoupled from height): 72px strip, scale+fader */
  narrow?: boolean;
  /** the measured strip height (T3 clamp math; dock/stories pass it) */
  stripH?: number;
  focused: boolean; flashing?: boolean;
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

  // subtle alternating row parity (A4) — raised on odd strips, shell on even
  const parityBg = index % 2 === 1 ? 'bg-raised' : 'bg-shell';

  /* ---- the accessory stack, parameterized by tier ---- */
  const inputRow = tier === 2 ? null : <InputRow />;
  const fxRack = <FxRack inserts={strip.inserts} name={track.name} slots={tier === 0 || tier === 3 ? 5 : 3} pushToast={pushToast} />;
  const iRow = <IRow trackId={track.id} name={track.name} />;
  const graphs =
    tier === 0 || tier === 3 ? (
      <div data-testid="strip-graphs" className="flex w-full shrink-0 flex-col gap-[2px] px-1 py-1">
        <EqThumb trackKey={track.id} />
        <DynThumb trackKey={track.id} />
      </div>
    ) : tier === 1 ? (
      <div data-testid="strip-graphs" className="flex w-full shrink-0 px-1 py-[2px]">
        <CombinedThumb trackKey={track.id} />
      </div>
    ) : null;
  const panRow = (
    <div className={`flex w-full shrink-0 items-center justify-center ${tier === 0 || tier === 3 ? 'h-[56px]' : 'h-[44px]'}`}>
      <PanBox pan={strip.pan} size={tier === 0 || tier === 3 ? 48 : 36} onChange={(pan) => setMixerTrack(track.id, { pan })} ariaLabel={`${track.name} pan`} />
    </div>
  );
  const routingRow = <RoutingRow track={track} strip={strip} onBus={(bus) => setMixerTrack(track.id, { outputBus: bus })} />;
  const titleRow = <TitleRow name={track.name} gold={role === 'music'} />;
  const rsmRow = <RsmRow sceneId={sceneId} track={track} name={track.name} />;

  /* ---- tier structure ---- */
  const headerName = tier === 1 || tier === 2 ? track.name : undefined;
  const fxCount = tier === 2 ? <FxCountChip inserts={strip.inserts} name={track.name} /> : null;

  let body: React.ReactNode;
  if (tier === 3) {
    // the accessory stack scrolls; hairline + RSM + the pinned trio follow
    const { faderHeight, scrollMin } = t3FaderLayout(stripH ?? 300);
    body = (
      <>
        <TopBar testId={`mixer-topbar-${track.badge}`} background={role ? ROLE_BAR[role] : 'var(--type-audio)'} />
        <StripHeader badge={track.badge} />
        <div
          data-testid={`strip-scroll-${track.badge}`}
          className="scroll-y flex min-h-0 w-full flex-1 flex-col"
          style={{ minHeight: `${scrollMin}px` }}
        >
          {inputRow}
          {fxRack}
          {graphs}
          {panRow}
          {routingRow}
          {titleRow}
        </div>
        <Hairline />
        {rsmRow}
        <FaderSection id={track.badge} db={strip.fader} peakDb={peak} pinnedHeight={faderHeight}>
          <FaderCol col="fader">
            <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} fillHeight scale headroom={false} ariaLabel={`${track.name} fader`} />
          </FaderCol>
          {!narrow && (
            <FaderCol col="meter">
              <StripMeter
                trackId={track.id}
                db={strip.fader}
                duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
                fillHeight
                label={track.name}
              />
            </FaderCol>
          )}
        </FaderSection>
      </>
    );
  } else if (tier === 0) {
    body = (
      <>
        <TopBar testId={`mixer-topbar-${track.badge}`} background={role ? ROLE_BAR[role] : 'var(--type-audio)'} />
        <StripHeader badge={track.badge} />
        <Hairline />
        {inputRow}
        {fxRack}
        {iRow}
        {graphs}
        <Hairline />
        {panRow}
        <Hairline />
        {routingRow}
        {titleRow}
        {rsmRow}
        <FaderSection id={track.badge} db={strip.fader} peakDb={peak}>
          <FaderCol col="fader">
            <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} fillHeight scale headroom={false} ariaLabel={`${track.name} fader`} />
          </FaderCol>
          {!narrow && (
            <FaderCol col="meter">
              <StripMeter
                trackId={track.id}
                db={strip.fader}
                duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
                fillHeight
                label={track.name}
              />
            </FaderCol>
          )}
        </FaderSection>
      </>
    );
  } else {
    // T1/T2 — the leaner row set (name merges into the header; T2 hides
    // graphs + input AND the fx rack — the count chip in the header replaces
    // it; T1 keeps the input row + the 3-slot rack)
    body = (
      <>
        <TopBar testId={`mixer-topbar-${track.badge}`} background={role ? ROLE_BAR[role] : 'var(--type-audio)'} />
        <StripHeader badge={track.badge} name={headerName}>
          {fxCount}
        </StripHeader>
        <Hairline />
        {inputRow}
        {tier === 1 && fxRack}
        {iRow}
        {graphs}
        {tier === 1 && <Hairline />}
        {panRow}
        {rsmRow}
        <FaderSection id={track.badge} db={strip.fader} peakDb={peak}>
          <FaderCol col="fader">
            <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} fillHeight scale headroom={false} ariaLabel={`${track.name} fader`} />
          </FaderCol>
          {!narrow && (
            <FaderCol col="meter">
              <StripMeter
                trackId={track.id}
                db={strip.fader}
                duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
                fillHeight
                label={track.name}
              />
            </FaderCol>
          )}
        </FaderSection>
      </>
    );
  }

  return (
    <div
      data-flash={flashing ? 'on' : undefined}
      className={`mixer-strip relative flex h-full min-h-0 shrink-0 flex-col border-r border-hairline ${focused ? 'bg-[color-mix(in_srgb,var(--accent-selection)_12%,var(--bg-shell)))] ring-1 ring-[var(--accent-selection)]' : `${parityBg} hover:bg-[var(--hover-overlay)]`}`}
      style={{ width: narrow ? 72 : 86 }}
      data-testid={`mixer-strip-${track.badge}`}
      onClick={onStripClick}
      role="group"
      aria-label={`${track.name} channel strip`}
    >
      {body}
    </div>
  );
}

/* ---------- aux return strip ----------
   Ours, not in the reference (model-backed, spec 20 §4.2 — deliberate
   divergence, flagged in the R19-B1 report): the same 86px/tier law with a
   lean accessory stack — the real bus ON/OFF toggle + the honest no-source
   chip share the 22px input-row slot; the bus name lives in the header at
   T1/T2 (the tier law — those tiers drop the title row) or the title row
   (T0: the header is ID-only, D5 — R24-W5c). Same TERMINAL fader section
   law as the channels. */
export function AuxStrip({ bus, tier = 0, narrow = false, stripH }: { bus: 'a1' | 'a2'; tier?: MixerTier; narrow?: boolean; stripH?: number }) {
  const settings = useUi((s) => s.mixer.buses[bus]);
  const setAuxBus = useUi((s) => s.setAuxBus);
  const pushToast = useUi((s) => s.pushToast);
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
  const badge = bus === 'a1' ? 'A1' : 'A2';

  /* R22 (#72 — "bus and master strips vs. channel all have separate length
     on the dailer and meter which looks bad"): the aux strips now carry the
     MASTER's alignment grammar — the same spacer stack (input 22 / fx-rack /
     I 26 / graphs / hairline / pan 56 / hairline / routing-slot 24) so the
     FADER + METER sections start at exactly the channel/master y. The bus
     ON/OFF rides the mRow slot (the terminal 24px row above the fader —
     the master's M row position). */
  const Spacer = ({ h }: { h: number }) => <div aria-hidden="true" className="w-full shrink-0" style={{ height: h }} />;
  const graphs =
    tier === 0 || tier === 3 ? (
      <div data-testid="strip-graphs" className="flex w-full shrink-0 flex-col gap-[2px] px-1 py-1">
        <EqThumb trackKey={bus === 'a1' ? 'auxA' : 'auxB'} flat />
        <DynThumb trackKey={bus === 'a1' ? 'auxA' : 'auxB'} />
      </div>
    ) : tier === 1 ? (
      <div data-testid="strip-graphs" className="flex w-full shrink-0 px-1 py-[2px]">
        <CombinedThumb trackKey={bus === 'a1' ? 'auxA' : 'auxB'} flat />
      </div>
    ) : null;

  /* the routing-slot row (the master's LUFS position): the honest no-source
     chip when the bus is unfed; empty otherwise */
  const sourceRow = (
    <div className="flex h-[24px] w-full shrink-0 items-center justify-center">
      {!hasSource ? (
        <span
          aria-disabled="true"
          data-tip="No track sends or routes feed this bus"
          data-testid={`mixer-nosource-${bus}`}
          className="mono text-[9px] uppercase tracking-wide text-tfaint"
          title="No track sends or routes feed this bus"
        >
          no source
        </span>
      ) : null}
    </div>
  );

  /* the mRow slot: the bus ON/OFF — the aux's one real terminal control
     (spec 20 §4.2 AuxBusSettings.on), M-row position parity */
  const onRow = (
    <div className="flex h-[24px] w-full shrink-0 items-center justify-center">
      <button
        onClick={() => setAuxBus(bus, { on: !settings.on })}
        aria-pressed={settings.on}
        aria-label={`Aux ${bus} bus on`}
        data-tip="Aux bus output enable"
        className={`mono shrink-0 rounded-[2px] border px-1 text-[10px] font-bold ${settings.on ? 'border-[var(--solo)] text-[var(--solo)]' : 'border-strong text-tmuted'}`}
      >
        {settings.on ? 'ON' : 'OFF'}
      </button>
    </div>
  );

  const faderBlock = (pinnedHeight?: number) => (
    <FaderSection id={`aux-${bus}`} db={settings.returnGain} peakDb={peak} pinnedHeight={pinnedHeight}>
      <FaderCol col="fader">
        <Fader db={settings.returnGain} onChange={(db) => setAuxBus(bus, { returnGain: db })} fillHeight headroom={false} ariaLabel={`Aux ${bus} return`} />
      </FaderCol>
      {!narrow && (
        <FaderCol col="meter">
          {/* R15-A2: ONE engine key per bus — 'auxA'/'auxB' (unified registry) */}
          <StripMeter trackId={key} db={settings.returnGain} fillHeight label={`Aux ${bus}`} />
        </FaderCol>
      )}
    </FaderSection>
  );

  /* the accessory stack per tier — MIRRORS the master's spacer grammar so
     every strip in the dock aligns (#72) */
  const accessory = (t: 0 | 3) => (
    <>
      <Spacer h={22} />
      <FxRack inserts={[null, null]} name={`Aux ${badge}`} slots={5} pushToast={pushToast} />
      <Spacer h={26} />
      {graphs}
      <Hairline />
      <Spacer h={56} />
      <Hairline />
      {sourceRow}
      <TitleRow name={settings.name} gold={false} />
    </>
  );

  let body: React.ReactNode;
  if (tier === 3) {
    const { faderHeight, scrollMin } = t3FaderLayout(stripH ?? 300);
    body = (
      <>
        <TopBar testId={`mixer-topbar-aux-${bus}`} background="var(--type-audio)" />
        <StripHeader badge={badge} />
        <div
          data-testid={`strip-scroll-aux-${bus}`}
          className="scroll-y flex min-h-0 w-full flex-1 flex-col"
          style={{ minHeight: `${scrollMin}px` }}
        >
          {accessory(3)}
        </div>
        <Hairline />
        {onRow}
        {faderBlock(faderHeight)}
      </>
    );
  } else if (tier === 0) {
    body = (
      <>
        <TopBar testId={`mixer-topbar-aux-${bus}`} background="var(--type-audio)" />
        {/* R24-W5c (DESIGN-R24 §2 F4-P3): the T0 header is ID-ONLY (the D5
            law the channels/master keep) — the bus NAME lives in the 26px
            title row below (the old name-in-header duplicated it live:
            "A1Reverb" + "Reverb"). T1/T2 still merge the name up (those
            tiers drop the title row — the shared tier law); T3 was already
            ID-only. */}
        <StripHeader badge={badge} />
        <Hairline />
        {accessory(0)}
        {onRow}
        {faderBlock()}
      </>
    );
  } else if (tier === 1) {
    body = (
      <>
        <TopBar testId={`mixer-topbar-aux-${bus}`} background="var(--type-audio)" />
        <StripHeader badge={badge} name={settings.name} />
        <Hairline />
        <Spacer h={22} />
        <FxRack inserts={[null, null]} name={`Aux ${badge}`} slots={3} pushToast={pushToast} />
        <Spacer h={26} />
        {graphs}
        <Hairline />
        <Spacer h={44} />
        {onRow}
        {faderBlock()}
      </>
    );
  } else {
    // T2 — 123 fixed rows, matching the lean channels + master exactly
    body = (
      <>
        <TopBar testId={`mixer-topbar-aux-${bus}`} background="var(--type-audio)" />
        <StripHeader badge={badge} name={settings.name} />
        <Hairline />
        <Spacer h={26} />
        <Spacer h={44} />
        {onRow}
        {faderBlock()}
      </>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-hairline bg-inset"
      style={{ width: narrow ? 72 : 86 }}
      role="group"
      aria-label={`Aux ${bus} return strip`}
      data-testid={`mixer-strip-aux-${bus}`}
    >
      {body}
    </div>
  );
}

/* ---------- master strip (reference M1) ----------
   Mirrors the channel anatomy with SPACERS (input 22 / I 26 / pan 56→44 at
   T1-2 / routing 24) so the fader tops align EXACTLY with the channels
   (contract D11 accepted deviation — the reference's own 48px spacer leaves
   the master fader ~10px high). The routing spacer carries the honest
   LUFS-v2 note (D12). M-only RSM (the real store master mute — same values
   as the toolbar, 18 §4.5); accent top bar + accent fader cap (D10). */
export function MasterStrip({ tier = 0, narrow = false, stripH }: { tier?: MixerTier; narrow?: boolean; stripH?: number }) {
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const setMasterVolume = useUi((s) => s.setMasterVolume);
  const pushToast = useUi((s) => s.pushToast);
  const db = masterMuted ? -60 : Math.round((masterVolume * 66 - 60) * 10) / 10;
  // engine view for the peak readout (ONE 'master' key — R15-A2 unification)
  const meter = useMeter('master');
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);

  const Spacer = ({ h }: { h: number }) => <div aria-hidden="true" className={`w-full shrink-0`} style={{ height: h }} />;
  const LufsRow = () => (
    <div className="flex h-[24px] w-full shrink-0 items-center justify-center">
      <span className="mono text-[9px] leading-none text-tfaint" title="Master loudness (LUFS) metering is a v2 surface">
        LUFS — v2
      </span>
    </div>
  );
  const mRow = (
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
  );
  const graphs =
    tier === 0 || tier === 3 ? (
      <div data-testid="strip-graphs" className="flex w-full shrink-0 flex-col gap-[2px] px-1 py-1">
        {/* reference M1's EQ graph is a flat line — deterministic flat */}
        <EqThumb trackKey="master" flat />
        <DynThumb trackKey="master" />
      </div>
    ) : tier === 1 ? (
      <div data-testid="strip-graphs" className="flex w-full shrink-0 px-1 py-[2px]">
        <CombinedThumb trackKey="master" flat />
      </div>
    ) : null;

  const faderBlock = (pinnedHeight?: number) => (
    <FaderSection id="master" db={db} peakDb={peak} pinnedHeight={pinnedHeight}>
      <FaderCol col="fader">
        <Fader db={db} onChange={(ndb) => setMasterVolume(Math.max(0, Math.min(1, (ndb + 60) / 66)))} fillHeight accent headroom={false} ariaLabel="Master fader" />
      </FaderCol>
      {!narrow && (
        <FaderCol col="meter">
          <StripMeter trackId="master" db={db} fillHeight label="Master" />
        </FaderCol>
      )}
    </FaderSection>
  );

  /* the scrolling/spacer accessory set — master has no input/I/pan/routing
     controls (no model fields), so those rows are alignment spacers; the
     hairline rhythm matches the channels so the fader tops align EXACTLY
     (T0: 380 fixed rows both; T1: 240; T2: 123) */
  const accessory = (t: 0 | 3) => (
    <>
      <Spacer h={22} />
      <FxRack inserts={[null, null]} name="Master" slots={5} pushToast={pushToast} />
      <Spacer h={26} />
      {graphs}
      <Hairline />
      <Spacer h={56} />
      <Hairline />
      <LufsRow />
      <TitleRow name="Master" gold={false} />
    </>
  );

  let body: React.ReactNode;
  if (tier === 3) {
    const { faderHeight, scrollMin } = t3FaderLayout(stripH ?? 300);
    body = (
      <>
        <TopBar testId="mixer-topbar-master" background="linear-gradient(90deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))" />
        <StripHeader badge="M1" />
        <div
          data-testid="strip-scroll-master"
          className="scroll-y flex min-h-0 w-full flex-1 flex-col"
          style={{ minHeight: `${scrollMin}px` }}
        >
          {accessory(3)}
        </div>
        <Hairline />
        {mRow}
        {faderBlock(faderHeight)}
      </>
    );
  } else if (tier === 0) {
    body = (
      <>
        <TopBar testId="mixer-topbar-master" background="linear-gradient(90deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))" />
        <StripHeader badge="M1" />
        <Hairline />
        {accessory(0)}
        {mRow}
        {faderBlock()}
      </>
    );
  } else if (tier === 1) {
    body = (
      <>
        <TopBar testId="mixer-topbar-master" background="linear-gradient(90deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))" />
        <StripHeader badge="M1" name="Master" />
        <Hairline />
        <Spacer h={22} />
        <FxRack inserts={[null, null]} name="Master" slots={3} pushToast={pushToast} />
        <Spacer h={26} />
        {graphs}
        <Hairline />
        <Spacer h={44} />
        {mRow}
        {faderBlock()}
      </>
    );
  } else {
    // T2 — 123 fixed rows, matching the lean channels exactly
    body = (
      <>
        <TopBar testId="mixer-topbar-master" background="linear-gradient(90deg, var(--fader-cap-accent-1), var(--fader-cap-accent-2))" />
        <StripHeader badge="M1" name="Master" />
        <Hairline />
        <Spacer h={26} />
        <Spacer h={44} />
        {mRow}
        {faderBlock()}
      </>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-0 shrink-0 flex-col"
      style={{ width: narrow ? 72 : 86 }}
      role="group"
      aria-label="Master strip"
      data-testid="mixer-strip-master"
    >
      {body}
    </div>
  );
}

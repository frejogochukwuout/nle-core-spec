/* MixerDock — the mixer surface docked to the RIGHT of the multi-track
   lanes (user direction: "side by side with multi-track", not a short row
   under the timeline). REBUILT R20-W1 per DESIGN-R20 D1 + the normative
   r20 mixer-contract (docs/r20/mixer-contract.md).

   Three states:
   - collapsed: not rendered (the F6 region auto-unregisters via
     mixerVisible in AppShell).
   - meters (D1.4 — replaces the old 44px stacked 'bridge' rail, thread #61):
     full dock height, thin per-track 24px meter COLUMNS side by side (badge
     row + 2×8px stereo bars + M/S micro dots), horizontally scrollable
     beyond capacity, the master column pinned right with mute + expand.
   - full: classic channel strips (uniform 86px reference anatomy —
     ChannelStrip) + aux returns + master, filling the timeline row's height.

   Height tiers (D1.3 / contract §4.2): MIXER_TIER {FULL 560, LEAN 420, MIN
   340, FLOOR 280}. The dock measures itself ONCE (a pre-paint layout pass +
   a ResizeObserver) and shares the tier with every strip — cross-strip
   fader-top alignment requires a SHARED tier. T3 (<340) turns each strip's
   accessory stack into a per-channel scroll (ChannelStrip owns the clamp
   math). Below the FLOOR (280) the strip layout is not renderable → the
   dock auto-falls back to the meters state + ONE honest toast per session
   (store flag mixerFloorWarned).

   B1 (R20-W0, PRESERVED — do not regress): the dock's width budget is
   measured on the DEFINITE timeline row (dock → wrapper → row; the wrapper
   is content-sized so a % resolves circularly against it — never use it):
   budget = min(0.6 × rowWidth, 22 + (N+3)×86). The channel scroll region
   keeps the 172px 2-strip floor; aux + master render AFTER it (never over
   it). Narrow mode (D1.3, decoupled from height): budget < N×86 → 72px
   strips, trio drops the meter column (metering lives in the meters state).

   B4 (thread #60): every state control's glyph + label carry the state —
   closed → no chrome; meters → PanelRight; full → PanelLeft. aria-pressed
   boolean + an aria-label/data-tip that NAMES the state and the next cycle
   stop (page-aware) on every control.

   Per-track M/S/L in the meters state is intentionally dots-only — the rail
   is a glance surface and the track headers + strip RSM rows carry the same
   store commands. F6-region: the dock joins the focus cycle as the 7th
   region (registered in AppShell).

   R23-WC (DESIGN-R23 D-C3; issue #70 — the R20-era carry-over): the FULL
   dock's master + aux-bus bank carries its OWN meters-only collapse
   (store view-state masterBusCollapsed, the stripArm survival law) —
   independent of the channel strips and of the 3-state cycle. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AudioLines, Gauge, PanelLeft, PanelRight } from 'lucide-react';
import { useUi, type MixerDockState, type Page } from '../../state/useUiStore';
import { ChannelStrip, AuxStrip, MasterStrip, ROLE_BAR } from './ChannelStrip';
import type { Role } from '../../state/mockMixer';
import { StripMeter } from './MixerPrimitives';
import type { TrackJSON } from '../../lib/mockData';

/* ---------- height tiers (D1.3 — tests pin the constants) ---------- */
export const MIXER_TIER = { FULL: 560, LEAN: 420, MIN: 340, FLOOR: 280 } as const;
export type MixerTier = 0 | 1 | 2 | 3;

/** pure band lookup (the <FLOOR fallback is the dock's job, not the map's) */
export function mixerTierFor(H: number): MixerTier {
  if (H >= MIXER_TIER.FULL) return 0;
  if (H >= MIXER_TIER.LEAN) return 1;
  if (H >= MIXER_TIER.MIN) return 2;
  return 3;
}

/* ---------- B4: state-naming labels for every mixer control ---------- */
const stateName = (m: MixerDockState) => (m === 'full' ? 'full strips' : m === 'meters' ? 'meter columns' : 'closed');

/** The label every mixer-state control carries: the CURRENT state + the
    next cycle stop (page-aware — Edit walks closed→meters→full→closed,
    Audio toggles meters↔full). */
export function mixerStateLabel(state: MixerDockState, page: Page): string {
  const next: MixerDockState = page === 'audio'
    ? (state === 'full' ? 'meters' : 'full')
    : (state === 'collapsed' ? 'meters' : state === 'meters' ? 'full' : 'collapsed');
  return next === 'collapsed'
    ? `Mixer: ${stateName(state)} (click to close)`
    : `Mixer: ${stateName(state)} (click for ${stateName(next)})`;
}

/* ---------- B1 width budget (W0, preserved + narrow trigger) ----------
   Measures the definite timeline row and caps the dock at min(0.6×rowW,
   needPx). Returns null until measured (jsdom never measures — tests stay
   deterministic). */
function useRowBudget(ref: React.RefObject<HTMLDivElement | null>, needPx: number, tracks: number): number | null {
  const [maxW, setMaxW] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // two ancestors up = the timeline row (flex-1, definite width); one up is
    // the content-sized shrink-0 wrapper (the B1 feedback loop — never use it)
    const row = el.parentElement?.parentElement;
    if (!row) return;
    const measure = () => {
      const rowW = row.getBoundingClientRect().width;
      if (rowW > 0) setMaxW(Math.min(0.6 * rowW, needPx));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [ref, needPx, tracks]);
  return maxW;
}

/* ---------- R23-WC (D-C3, #70): the master/bus bank's meters-only columns
   The full dock's right bank (2 aux + master) collapses to thin meter
   COLUMNS — the MetersDock's D1.4 grammar (badge + full-height stereo
   meter; the master keeps its one real store command, the M mute, exactly
   like the meters dock's master column; the buses carry an ON/OFF display
   mirror — the full strips own the commands). Independent of the channel
   strips: their tier/anatomy is untouched by this collapse. ---------- */
function BusMeterCol({ bus }: { bus: 'a1' | 'a2' }) {
  const settings = useUi((s) => s.mixer.buses[bus]);
  return (
    <div
      data-testid={`mixer-bank-col-${bus}`}
      role="group"
      aria-label={`Aux ${bus} meter`}
      className="flex w-[24px] shrink-0 flex-col items-center gap-1 py-1"
      title={`Aux ${bus} ${settings.name} — return ${settings.returnGain} dB${settings.on ? '' : ' · bus off'}`}
    >
      <span className="mono text-[10px] font-semibold uppercase text-tmuted">{bus === 'a1' ? 'A1' : 'A2'}</span>
      <div className="flex min-h-0 w-full flex-1 justify-center">
        {/* R15-A2: ONE engine key per bus — 'auxA'/'auxB' (unified registry) */}
        <StripMeter trackId={bus === 'a1' ? 'auxA' : 'auxB'} db={settings.returnGain} width={8} fillHeight label={`Aux ${bus}`} />
      </div>
      <span
        data-testid={`mixer-bank-on-${bus}`}
        className={`h-[4px] w-[4px] rounded-full ${settings.on ? 'bg-[var(--solo)]' : 'bg-strong'}`}
        title={`Bus ${settings.on ? 'on' : 'off'} — expand the bank for the ON/OFF toggle`}
      />
    </div>
  );
}

function MasterMeterCol() {
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const db = masterMuted ? -60 : masterVolume * 66 - 60;
  return (
    <div
      data-testid="mixer-bank-col-master"
      role="group"
      aria-label="Master meter column"
      className="flex w-[30px] shrink-0 flex-col items-center gap-1 py-1"
    >
      <span className="mono text-[10px] font-semibold uppercase tracking-wide text-tprimary">MST</span>
      <div className="flex min-h-0 w-full flex-1 justify-center">
        <StripMeter trackId="master" db={db} width={8} fillHeight label="Master" />
      </div>
      <button
        onClick={toggleMasterMute}
        aria-pressed={masterMuted}
        aria-label="Master mute"
        data-tip="Master mute"
        className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${masterMuted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}
      >
        M
      </button>
    </div>
  );
}

/* ---------- meters dock (D1.4 — thread #61 redesign) ---------- */
function MeterColumn({ track }: { track: TrackJSON }) {
  const mixer = useUi((s) => s.mixer);
  const strip = mixer.tracks[track.id];
  const role = mixer.roles[track.id] as Role | undefined;
  const duck = mixer.ducking[track.id];
  return (
    <div
      data-testid={`meter-col-${track.badge}`}
      role="group"
      aria-label={`${track.name} meter`}
      className="flex w-[24px] shrink-0 flex-col items-center gap-1"
      title={`${track.name} — fader ${strip?.fader ?? -6} dB`}
    >
      {/* badge row: 10px mono, family color (role ramp — D14 token law) */}
      <span className="mono text-[10px] font-semibold" style={{ color: role ? ROLE_BAR[role] : 'var(--type-audio)' }}>
        {track.badge}
      </span>
      {/* 2×8px stereo bars, full dock height (ONE engine key per track) */}
      <div className="flex min-h-0 w-full flex-1 justify-center">
        <StripMeter
          trackId={track.id}
          db={strip?.fader ?? -6}
          duckAmount={role === 'bgm' || role === 'music' ? (duck?.amount ?? 0) : 0}
          width={8}
          fillHeight
          label={track.name}
        />
      </div>
      {/* M/S micro dots — display-only mirrors of the doc-slice state (the
          track headers + strip RSM rows own the commands) */}
      <div
        data-testid={`meter-ms-${track.badge}`}
        className="flex items-center gap-1"
        title={`Mute ${track.muted ? 'on' : 'off'} · Solo ${track.solo ? 'on' : 'off'} — toggle on the track header`}
      >
        <span className={`h-[4px] w-[4px] rounded-full ${track.muted ? 'bg-[var(--mute-warn)]' : 'bg-strong'}`} />
        <span className={`h-[4px] w-[4px] rounded-full ${track.solo ? 'bg-[var(--solo)]' : 'bg-strong'}`} />
      </div>
    </div>
  );
}

function MetersDock() {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  const page = useUi((s) => s.page);
  /* R20-W6FIX (P2-2): the expand button's pressed state derives from the
     ACTUAL dock state (open = mixerState !== 'collapsed') — the dock IS
     open in the meters state, so the old hard-coded aria-pressed={false}
     was a lie to assistive tech. The label/data-tip still names the state
     + next cycle stop (B4). */
  const open = useUi((s) => s.mixerState !== 'collapsed');
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const ref = useRef<HTMLDivElement>(null);
  // B1 budget: N columns + the pinned master column + rail padding
  const maxW = useRowBudget(ref, audio.length * 24 + 46, audio.length);
  // B4: from `meters` the cycle lands on FULL on both pages
  const expandLabel = mixerStateLabel('meters', page);

  return (
    <div
      ref={ref}
      data-testid="mixer-dock-meters"
      role="group"
      aria-label="Mixer meters"
      className="flex h-full shrink-0 items-stretch border-l border-hairline bg-shell"
      style={maxW !== null ? { maxWidth: `${Math.round(maxW)}px` } : undefined}
    >
      {/* per-track columns — horizontal scroll beyond capacity (thread #61:
          never stacked) */}
      <div data-testid="meters-scroll" className="flex min-h-0 min-w-0 flex-1 items-stretch gap-1 overflow-x-auto p-1">
        {audio.map((t) => (
          <MeterColumn key={t.id} track={t} />
        ))}
      </div>
      {/* master column pinned right: badge + full-height meter + mute +
          expand (R15-A2: the ONE 'master' engine key, same values as the
          toolbar/strip masters — one source) */}
      <div
        data-testid="meter-col-master"
        role="group"
        aria-label="Master meter column"
        className="flex w-[30px] shrink-0 flex-col items-center gap-1 border-l border-hairline py-1"
      >
        <span className="mono text-[10px] font-semibold uppercase tracking-wide text-tprimary">MST</span>
        <div className="flex min-h-0 w-full flex-1 justify-center">
          <StripMeter trackId="master" db={masterMuted ? -60 : masterVolume * 66 - 60} width={8} fillHeight label="Master" />
        </div>
        <button
          onClick={toggleMasterMute}
          aria-pressed={masterMuted}
          aria-label="Master mute"
          data-tip="Master mute"
          className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${masterMuted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}
        >
          M
        </button>
        <button
          className="icon-btn icon-btn-sm"
          onClick={() => cycleMixerState()}
          data-tip={expandLabel}
          aria-label={expandLabel}
          aria-pressed={open /* P2-2: meters IS open — never hard-code false */}
        >
          <PanelRight size={12} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

/* ---------- full dock: classic strip row ---------- */
function FullDock() {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const stripFocus = useUi((s) => s.stripFocus);
  const stripFlash = useUi((s) => s.stripFlash);
  const setStripFocus = useUi((s) => s.setStripFocus);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  const page = useUi((s) => s.page);
  /* R23-WC (D-C3, #70): the master/bus bank's OWN meters-only collapse —
     read here so the bank + its control stay in sync across the dock's
     state cycles (the stripArm survival law). */
  const masterBusCollapsed = useUi((s) => s.masterBusCollapsed);
  const toggleMasterBus = useUi((s) => s.toggleMasterBus);
  /* R20-W6FIX (P2-2): same law as the meters dock — the collapse control's
     pressed state is DERIVED (open = mixerState !== 'collapsed'), not the
     bare always-true attribute it used to carry. */
  const open = useUi((s) => s.mixerState !== 'collapsed');
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const [flashOn, setFlashOn] = useState(false);

  /* D1.3 height tiers: pre-paint pass + RO, ONE shared tier + measured
     height for every strip (fader-top alignment). The pre-measure default
     is T0 (full anatomy) — the layout pass corrects it before the first
     paint; jsdom never measures (offsetHeight 0 → guarded), keeping tests
     deterministic. Below the FLOOR: auto-fallback to the meters state +
     ONE honest toast per session (store flag). */
  const ref = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<MixerTier>(0);
  const [dockH, setDockH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const H = el.offsetHeight;
      if (H <= 0) return; // unmeasured — keep the pre-measure default
      if (H < MIXER_TIER.FLOOR) {
        const s = useUi.getState();
        useUi.setState({ mixerState: 'meters', ...(s.mixerFloorWarned ? {} : { mixerFloorWarned: true }) });
        if (!s.mixerFloorWarned) {
          s.pushToast({
            kind: 'info',
            title: 'Mixer floor',
            detail: `The mixer dock is ${Math.round(H)}px tall — below the 280px strip floor, so it switched to meter columns. Drag the viewer splitter down to give the strips room.`,
          });
        }
        return;
      }
      setTier(mixerTierFor(H));
      setDockH(H);
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* B1 (W0, PRESERVED): budget = min(0.6×rowW, 22 + (N+3)×86) measured on
     the definite timeline row; narrow mode (D1.3, width-only) fires when
     the budget cannot fit the N channel strips at 86px. */
  const nStrips = audio.length + 3; // + 2 aux + master
  const maxW = useRowBudget(ref, 22 + nStrips * 86, audio.length);
  const narrow = maxW !== null && maxW < audio.length * 86;

  const collapseLabel = mixerStateLabel('full', page);
  /* D-C3 (#70) — B4's state-naming law for the bank control: current state
     + next stop; pressed = the meters-only state (the toggle's effect). */
  const bankLabel = `Master/buses: ${masterBusCollapsed ? 'meters only' : 'full strips'} (click for ${masterBusCollapsed ? 'full strips' : 'meters only'})`;

  // strip-focus flash (escalation gesture feedback) — 1.2s ring, same as v2.1
  useEffect(() => {
    if (!stripFlash) return;
    setFlashOn(true);
    const t = setTimeout(() => setFlashOn(false), 1200);
    return () => clearTimeout(t);
  }, [stripFlash]);

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 shrink-0 items-stretch border-l border-hairline bg-shell"
      style={maxW !== null ? { maxWidth: `${Math.round(maxW)}px` } : undefined}
      data-testid="mixer-dock-full"
      role="group"
      aria-label="Audio mixer"
    >
      {/* dock header — vertical label + the state-aware collapse control (B4)
          + the master/bus bank's own meters-only toggle (R23-WC D-C3, #70 —
          independent of the channel strips and of the 3-state cycle) */}
      <div className="relative flex w-[22px] shrink-0 flex-col items-center justify-between border-r border-hairline py-1.5">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => cycleMixerState()}
            className="icon-btn icon-btn-sm"
            data-tip={collapseLabel}
            aria-label={collapseLabel}
            aria-pressed={open /* P2-2: explicit boolean, derived from state */}
          >
            <PanelLeft size={12} strokeWidth={1.7} />
          </button>
          <button
            onClick={() => toggleMasterBus()}
            className="icon-btn icon-btn-sm"
            data-testid="mixer-masterbus-toggle"
            data-tip={bankLabel}
            aria-label={bankLabel}
            aria-pressed={masterBusCollapsed /* honest: pressed = meters-only */}
          >
            <Gauge size={12} strokeWidth={1.7} />
          </button>
        </div>
        <span
          className="mono select-none text-[10px] font-semibold uppercase tracking-[0.18em] text-tfaint"
          style={{ writingMode: 'vertical-rl' }}
          aria-hidden="true"
        >
          MIXER · G-LAYER
        </span>
        <AudioLines size={11} strokeWidth={1.6} className="text-tfaint" aria-hidden="true" />
      </div>
      {/* channel strips — their own horizontal scroll region (2-strip floor);
          strips stretch the FULL dock height with terminal fader sections
          (th_mto6496s) and the shared height tier (D1.3) */}
      <div className="flex min-h-0 min-w-[172px] items-stretch overflow-x-auto">
        {audio.map((t, i) => (
          <ChannelStrip
            key={t.id}
            track={t}
            sceneId={scene.id}
            tier={tier}
            narrow={narrow}
            stripH={dockH ?? undefined}
            focused={stripFocus === t.id}
            flashing={flashOn && stripFocus === t.id}
            index={i} /* A4: subtle alternating bg parity across the strip row */
            onStripClick={() => setStripFocus(t.id)}
          />
        ))}
      </div>
      {/* aux returns + master PINNED to the dock's right edge — the dock's
          right region always carries the return/master bank cleanly, never
          dead space and never scrolled away under the channel row (fixes
          th_mto63f99). R23-WC (D-C3, #70): the bank collapses to meters-only
          columns via its OWN toggle — the channel strips above are untouched
          (the independence law). */}
      {masterBusCollapsed ? (
        <>
          <BusMeterCol bus="a1" />
          <BusMeterCol bus="a2" />
          <MasterMeterCol />
        </>
      ) : (
        <>
          <AuxStrip bus="a1" tier={tier} narrow={narrow} stripH={dockH ?? undefined} />
          <AuxStrip bus="a2" tier={tier} narrow={narrow} stripH={dockH ?? undefined} />
          <MasterStrip tier={tier} narrow={narrow} stripH={dockH ?? undefined} />
        </>
      )}
    </div>
  );
}

/* ---------- the 3-state container ---------- */
export function MixerDock() {
  const mixerState = useUi((s) => s.mixerState);
  if (mixerState === 'collapsed') return null;
  return mixerState === 'meters' ? <MetersDock /> : <FullDock />;
}

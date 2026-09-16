/* MixerDock — the mixer surface docked to the RIGHT of the multi-track
   lanes (user direction: "side by side with multi-track", not a short row
   under the timeline). REBUILT R20-W1 per DESIGN-R20 D1 + the normative
   r20 mixer-contract (docs/r20/mixer-contract.md).

   Two states + the R25-W4-E density ladder inside the open state (R24-W1 —
   the 3-state cycle is dead; open/close is the toolbars' binary
   toggleMixerOpen, audio page only — Toolbar2 is the toggle's ONE home
   since W4-D removed the timeline-toolbar twin):
   - collapsed: not rendered (the F6 region auto-unregisters via
     mixerVisible in AppShell).
   - meters (D1.4 — replaces the old 44px stacked 'bridge' rail, thread #61):
     full dock height, thin per-track 24px meter COLUMNS side by side (badge
     row + 2×8px stereo bars + M/S micro dots), horizontally scrollable
     beyond capacity, the master column pinned right with mute + expand.
   - full: classic channel strips (uniform 86px reference anatomy —
     ChannelStrip) + aux returns + master, filling the timeline row's height,
     degraded by the density ladder (below) all the way down to the mini
     meters surface at the true floor.

   Height ladder (D1.3 → R25-W4-E, thread th_mtzozdvo "responsive design,
   not mini-style switch"): MIXER_TIER {FULL 560, LEAN 420, MIN 340, FLOOR
   280} + MIXER_CORE_FLOOR 200. The dock measures itself ONCE at the
   CONTAINER (the `mixer-dock` wrapper — the one measurement site; a
   pre-paint layout pass + a ResizeObserver) and shares the density + tier
   with every strip (cross-strip fader-top alignment requires a SHARED
   ladder): full ≥340 runs the T0/T1/T2 tier ladder; lean [280,340) hides
   the optional blocks (the W4-A set + I/routing/title; fader+meters+RSM
   stay); core [200,280) = meters+fader only; below 200 even meters+fader
   cannot fit → the container PURE-RENDERS MetersDock (the mini style —
   the LAST resort) while mixerState stays untouched (R24-W1/#60's silent
   law, re-based from the old 280 straight jump; no store write, no toast,
   no session flag; the strips return the moment the height grows back).
   The old T3 per-channel-scroll tier is DEAD (deletion-pinned) — the
   ladder replaces scrolling with element hiding.

   R25-W4-A (thread th_mtzou0op): the dock header carries the strip
   element-visibility toggle group (fx grid / pan / input / graphs —
   mixerElementVisibility view-state; composes with the ladder: user-hidden
   stays hidden at every level, the ladder only removes more).

   B1 (R20-W0, PRESERVED — do not regress): the dock's width budget is
   measured on the DEFINITE timeline row (dock → wrapper → row; the wrapper
   is content-sized so a % resolves circularly against it — never use it):
   budget = min(0.6 × rowWidth, 22 + (N+3)×86). The channel scroll region
   keeps the 172px 2-strip floor; aux + master render AFTER it (never over
   it). Narrow mode (D1.3, decoupled from height): budget < N×86 → 72px
   strips, trio drops the meter column (metering lives in the meters state).

   B4 (thread #60) → R24-W1 (A3-R3 — the 3-state cycle is DEAD): the dock
   header's mode controls — the meters master-column's PanelRight →
   setMixerState('full') "Expand to full strips"; the full dock header's
   PanelLeft → setMixerState('meters') "Collapse to meter columns". These
   are mode ACTIONS, not toggles: NO aria-pressed (an action can't lie —
   R20-W6FIX's derived-pressed hack died with the cycle). Open/close is the
   toolbars' binary toggleMixerOpen (audio page only); cycleMixerState +
   mixerStateLabel are DELETED (deletion-pinned). R25-W4-C (th_mtzoxrhb):
   the bank toggle's glyph is BarChart3 (the meters-columns shape — the old
   Gauge speedometer was the "wrong icon").

   Per-track M/S/L in the meters state is intentionally dots-only — the rail
   is a glance surface and the track headers + strip RSM rows carry the same
   store commands. F6-region: the dock joins the focus cycle as the 7th
   region (registered in AppShell).

   R23-WC (DESIGN-R23 D-C3; issue #70 — the R20-era carry-over): the FULL
   dock's master + aux-bus bank carries its OWN meters-only collapse
   (store view-state masterBusCollapsed, the stripArm survival law) —
   independent of the channel strips and of the dock-level open/mode state. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Activity, AudioLines, BarChart3, MoveHorizontal, PanelLeft, PanelRight, Plug, Sparkles, type LucideIcon } from 'lucide-react';
import { useUi, type MixerDockState } from '../../state/useUiStore';
import { ChannelStrip, AuxStrip, MasterStrip, ROLE_BAR } from './ChannelStrip';
import type { Role } from '../../state/mockMixer';
import { StripMeter } from './MixerPrimitives';
import type { TrackJSON } from '../../lib/mockData';

/* ---------- height ladder (D1.3 → R25-W4-E, th_mtzozdvo — the four
   constants now carry the DENSITY boundaries; tests pin the constants) ----------
   MIXER_TIER {FULL 560, LEAN 420, MIN 340, FLOOR 280} + MIXER_CORE_FLOOR 200:
   - FULL/LEAN bound the T0/T1 tier pair inside density 'full' (T2 = the
     rest of 'full' down to MIN);
   - MIN 340 = full → lean (Level 1: the optional blocks hide);
   - FLOOR 280 = lean → core (Level 2: meters+fader only);
   - MIXER_CORE_FLOOR 200 = core → mini (the TRUE floor — only when even
     meters+fader cannot fit: 3px bar + 25px header + the 164px fader
     travel floor ≈ 192; the R24-W1 #60 fallback re-based from the old
     280 straight jump to the ladder's last resort). */
export const MIXER_TIER = { FULL: 560, LEAN: 420, MIN: 340, FLOOR: 280 } as const;
export const MIXER_CORE_FLOOR = 200;
/** the T3 per-channel-scroll tier is DEAD (R25-W4-E, deletion-pinned) — the
 *  tier pair is T0/T1/T2 only; below MIN the density ladder owns the row set */
export type MixerTier = 0 | 1 | 2;
/** R25-W4-E: the dock-body density ladder (the data-density attribute's
 *  domain; 'mini' = the MetersDock pure-render fallback). */
export type MixerDockDensity = 'full' | 'lean' | 'core' | 'mini';

/** pure tier lookup (T0/T1/T2 — called only inside density 'full') */
export function mixerTierFor(H: number): MixerTier {
  if (H >= MIXER_TIER.FULL) return 0;
  if (H >= MIXER_TIER.LEAN) return 1;
  return 2;
}

/** R25-W4-E: the pure density-band lookup — full ≥340 / lean [280,340) /
 *  core [200,280) / mini <200. The wrapper measures once and shares it. */
export function mixerDensityFor(H: number): MixerDockDensity {
  if (H >= MIXER_TIER.MIN) return 'full';
  if (H >= MIXER_TIER.FLOOR) return 'lean';
  if (H >= MIXER_CORE_FLOOR) return 'core';
  return 'mini';
}

/* ---------- R24-W1 (A3-R3): the mode-action labels (the cycle labels
   died with cycleMixerState/mixerStateLabel — deletion-pinned) ---------- */
const EXPAND_LABEL = 'Expand to full strips';
const COLLAPSE_LABEL = 'Collapse to meter columns';

/* ---------- R25-W4-A (th_mtzou0op): the strip element-visibility toggles ----------
   The dock-header column's mini toggle group (the strips' SHARED header —
   the 22px chrome column every strip already aligns to; a horizontal row
   would steal strip width or live above the scroll region). View-state
   only: mixerElementVisibility + toggleMixerElement (the masterBusCollapsed
   precedent — no history, no doc writes). Glyphs: house lucide set —
   Sparkles (the FX-domain glyph, FxBrowser/FxInspector/left-dock FX),
   MoveHorizontal (the pan box's left/right law), Plug (the input row's
   input-routing domain), Activity (the waveform/graph glyph, TrackHeader
   waveform + Scopes). */
type MixerElementKey = keyof ReturnType<typeof useUi.getState>['mixerElementVisibility'];
const ELEMENT_TOGGLES: { key: MixerElementKey; label: string; Icon: LucideIcon }[] = [
  { key: 'fx', label: 'FX sends grid', Icon: Sparkles },
  { key: 'pan', label: 'Pan control', Icon: MoveHorizontal },
  { key: 'input', label: 'Input row', Icon: Plug },
  { key: 'graphs', label: 'EQ/dynamics graphs', Icon: Activity },
];

/* ---------- B1 width budget (W0, preserved + narrow trigger) ----------
   Measures the definite timeline row and caps the dock at min(0.6×rowW,
   needPx). Returns null until measured (jsdom never measures — tests stay
   deterministic).
   R24-W1: the chain grew ONE node — the `mixer-dock` measurement wrapper —
   so the definite row is THREE ancestors up now (dock surface → mixer-dock
   wrapper → shell-region content-sized wrapper → the flex-1 console row). */
function useRowBudget(ref: React.RefObject<HTMLDivElement | null>, needPx: number, tracks: number): number | null {
  const [maxW, setMaxW] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // three ancestors up = the timeline row (flex-1, definite width); the two
    // below it are content-sized shrink-0 wrappers (the B1 feedback loop —
    // never use them)
    const row = el.parentElement?.parentElement?.parentElement;
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

function MetersDock({ expandBlocked = false }: { expandBlocked?: boolean }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  /* R24-W1 (A3-R3): the expand control is a MODE action — no aria-pressed
     (an action can't lie); it goes to FULL, exactly what it says.
     R25-F2 (A6): below MIXER_CORE_FLOOR the container pure-renders THIS
     surface no matter what mixerState says, so the action would be a SILENT
     NO-OP — the honest-control law: aria-disabled + the height-floor reason
     in the tip + NO onClick (nothing can mint a no-op store write). */
  const setMixerState = useUi((s) => s.setMixerState);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const ref = useRef<HTMLDivElement>(null);
  // B1 budget: N columns + the pinned master column + rail padding
  const maxW = useRowBudget(ref, audio.length * 24 + 46, audio.length);

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
          toolbar/strip masters — one source). R25-F2 (A5): the column's
          padding is p-1 — the meters-scroll twin (the old py-1 left the
          master's badge/meter 4px out of line with the track columns:
          the scroll region carries p-1 around ITS columns). */}
      <div
        data-testid="meter-col-master"
        role="group"
        aria-label="Master meter column"
        className="flex w-[30px] shrink-0 flex-col items-center gap-1 border-l border-hairline p-1"
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
          onClick={expandBlocked ? undefined : () => setMixerState('full')}
          data-tip={expandBlocked
            ? `${EXPAND_LABEL} — disabled: the dock is below the 200px core floor (meters+fader cannot fit); raise the mixer row's height first`
            : EXPAND_LABEL}
          aria-label={expandBlocked
            ? `${EXPAND_LABEL} — disabled below the 200px core floor`
            : EXPAND_LABEL}
          aria-disabled={expandBlocked || undefined}
        >
          <PanelRight size={12} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

/* ---------- full dock: classic strip row ---------- */
function FullDock({ density, tier }: { density: Exclude<MixerDockDensity, 'mini'>; tier: MixerTier }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const stripFocus = useUi((s) => s.stripFocus);
  const stripFlash = useUi((s) => s.stripFlash);
  const setStripFocus = useUi((s) => s.setStripFocus);
  /* R24-W1 (A3-R3): the collapse control is a MODE action → 'meters' (it
     never closes the dock — that is toggleMixerOpen's job in the toolbars). */
  const setMixerState = useUi((s) => s.setMixerState);
  /* R23-WC (D-C3, #70): the master/bus bank's OWN meters-only collapse —
     read here so the bank + its control stay in sync across the dock's
     state cycles (the stripArm survival law). */
  const masterBusCollapsed = useUi((s) => s.masterBusCollapsed);
  const toggleMasterBus = useUi((s) => s.toggleMasterBus);
  /* R25-W4-A (th_mtzou0op): the strip element-visibility toggle group's
     store seam (view-state; the strips read the atom themselves). */
  const elementVisibility = useUi((s) => s.mixerElementVisibility);
  const toggleMixerElement = useUi((s) => s.toggleMixerElement);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const [flashOn, setFlashOn] = useState(false);

  /* R25-W4-E: the height ladder is MEASURED BY THE CONTAINER (the
     `mixer-dock` wrapper — one measurement site: density + tier arrive as
     props; the pre-measure default is density 'full'/T0, and jsdom never
     measures (offsetHeight 0 → guarded), keeping tests deterministic.
     Below MIXER_CORE_FLOOR this component never gets a say — the container
     pure-renders MetersDock (no store write, no toast, no flag). */
  const ref = useRef<HTMLDivElement>(null);

  /* B1 (W0, PRESERVED): budget = min(0.6×rowW, 22 + (N+3)×86) measured on
     the definite timeline row; narrow mode (D1.3, width-only) fires when
     the budget cannot fit the N channel strips at 86px. */
  const nStrips = audio.length + 3; // + 2 aux + master
  const maxW = useRowBudget(ref, 22 + nStrips * 86, audio.length);
  const narrow = maxW !== null && maxW < audio.length * 86;

  const collapseLabel = COLLAPSE_LABEL;
  /* D-C3 (#70) — B4's law for the bank control (a REAL toggle, pressed =
     the meters-only state — the toggle's effect; unlike the mode actions
     above it flips a boolean, so aria-pressed stays honest). */
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
      {/* dock header — vertical label + the collapse-to-meters mode action
          (B4 → R24-W1 A3-R3) + the master/bus bank's own meters-only toggle
          (R23-WC D-C3, #70 — independent of the channel strips) + the R25-W4-A
          strip element-visibility toggle group (the strips' shared header) */}
      <div className="relative flex w-[22px] shrink-0 flex-col items-center justify-between border-r border-hairline py-1.5">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setMixerState('meters')}
            className="icon-btn icon-btn-sm"
            data-tip={collapseLabel}
            aria-label={collapseLabel}
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
            {/* R25-W4-C (th_mtzoxrhb "wrong icon" — the reviewer's line 364):
                the old Gauge (a speedometer) read as an instrument, not a
                meters-only collapse. BarChart3 (lucide v1.39 aliases it to
                chart-column) = the collapsed bank's own shape — thin vertical
                meter columns — semantically exact, and distinct from the
                PanelLeft/PanelRight mode-action pair (the B4 distinctness law). */}
            <BarChart3 size={12} strokeWidth={1.7} />
          </button>
        </div>
        {/* R25-W4-A: the strip element-visibility mini toggles (aria-pressed +
            the element name in the tip; view-state, no history) — grouped so
            the F6/rover semantics stay one landmark. R25-F2 (A8): the TIP is
            composed with the density + tier ladder — the toggle's stored
            flag is the PREFERENCE, the ladder is what's on screen; a "shown"
            tip at lean/core density lied (the ladder hides the element even
            with the flag on). */}
        <div role="group" aria-label="Strip elements" className="flex flex-col items-center gap-1">
          {ELEMENT_TOGGLES.map(({ key, label, Icon }) => {
            /* the ladder's own hiding: lean/core hide ALL four elements; T2
               additionally hides the input row + graphs inside 'full'. */
            const tierHides = (key === 'input' || key === 'graphs') && tier === 2;
            const shown = elementVisibility[key] && density === 'full' && !tierHides;
            const reason = shown
              ? 'shown'
              : elementVisibility[key]
                ? `hidden by the density ladder (dock at ${density}${tierHides ? ` / T${tier}` : ''} density — full strips at T0/T1 carry it)`
                : 'hidden (view state)';
            return (
              <button
                key={key}
                onClick={() => toggleMixerElement(key)}
                className={`icon-btn icon-btn-sm ${elementVisibility[key] ? 'toggled' : ''}`}
                data-testid={`mixer-element-${key}`}
                data-tip={`${label} — ${reason}`}
                aria-label={`${label} visibility`}
                aria-pressed={elementVisibility[key]}
              >
                <Icon size={12} strokeWidth={1.7} />
              </button>
            );
          })}
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
      {/* channel strips + the aux/master bank — ONE horizontal scroll region
          (2-strip floor). R25-F1-A3 (RE-PINS th_mto63f99): the bank used to
          sit OUTSIDE this scroll region as shrink-0 siblings, so the B1
          maxWidth budget (which binds only the scroll region — the only
          shrinkable child) never bound the pinned bank: below ~750px row
          width the aux-A2 + master strips painted past the dock's cap and
          the shell clipped them — unreachable at any width under ~750px.
          The bank now rides INSIDE the scroll region as scrolling content at
          its natural end: when the budget cannot fit it, the SAME horizontal
          scrollbar that covers overflowed channels covers the bank too — the
          master bus stays reachable at every width (scrollLeft reaches it).
          Strips still stretch the FULL dock height with terminal fader
          sections (th_mto6496s) and the shared density/tier ladder
          (D1.3 → W4-E). */}
      <div data-testid="channel-scroll" className="flex min-h-0 min-w-[172px] items-stretch overflow-x-auto">
        {audio.map((t, i) => (
          <ChannelStrip
            key={t.id}
            track={t}
            sceneId={scene.id}
            tier={tier}
            density={density}
            narrow={narrow}
            focused={stripFocus === t.id}
            flashing={flashOn && stripFocus === t.id}
            index={i} /* A4: subtle alternating bg parity across the strip row */
            onStripClick={() => setStripFocus(t.id)}
          />
        ))}
        {/* R23-WC (D-C3, #70): the bank collapses to meters-only columns via
            its OWN toggle — the channel strips are untouched (the
            independence law). */}
        {masterBusCollapsed ? (
          <>
            <BusMeterCol bus="a1" />
            <BusMeterCol bus="a2" />
            <MasterMeterCol />
          </>
        ) : (
          <>
            <AuxStrip bus="a1" tier={tier} density={density} narrow={narrow} />
            <AuxStrip bus="a2" tier={tier} density={density} narrow={narrow} />
            <MasterStrip tier={tier} density={density} narrow={narrow} />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- the container: binary mount + the density ladder ----------
   R24-W1 (DESIGN-R24 §1.3 A2-R2; issue #60 — "why is there a mixer floor
   dialog? makes no sense … restricting / warning user is the right ux we
   both know the answer. responsive design is the right way") → R25-W4-E
   (DESIGN-R25 §1 R17; thread th_mtzozdvo "instead of switching to mini
   style we should use responsible design to hide certain elements and only
   when the minimal still cannot fit we degrade to the mini meter style"):
   the ladder is a RENDER-LEVEL response, never a state change. This thin
   wrapper (testid `mixer-dock`) measures its own height (pre-paint layout
   pass + a ResizeObserver — the D1.3 measurement pattern, now the ONE
   measurement site for the whole dock: density AND tier derive from it)
   and picks the density: full (≥340, the tier ladder runs) → lean
   ([280,340): the optional blocks hide) → core ([200,280): meters+fader
   only) → mini (<200: the TRUE floor — PURE-RENDERS MetersDock as the LAST
   resort, only when even meters+fader cannot fit) while `mixerState` stays
   untouched: no store write, no toast, no flag. The attribute
   data-density="full|lean|core|mini" rides this wrapper (the dock body).
   Strips return when the height grows. jsdom never measures (offsetHeight
   0 → guarded), keeping tests deterministic. */
export function MixerDock() {
  const mixerState = useUi((s) => s.mixerState);
  if (mixerState === 'collapsed') return null;
  return <MixerDockBody state={mixerState} />;
}

function MixerDockBody({ state }: { state: Exclude<MixerDockState, 'collapsed'> }) {
  const ref = useRef<HTMLDivElement>(null);
  /* the ONE measured height — density AND tier derive from it (the tier
   * ladder runs only inside density 'full'; below MIN the density's own row
   * set wins and the strips ignore the tier). Un-measured (jsdom, or the
   * pre-paint pass) = null → density 'full'/T0, the deterministic default. */
  const [H, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const h = el.offsetHeight;
      if (h <= 0) return; // unmeasured (jsdom) — keep the pre-measure default
      setH(h);
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const density: MixerDockDensity = H === null ? 'full' : mixerDensityFor(H);
  return (
    <div
      ref={ref}
      data-testid="mixer-dock"
      data-density={density}
      className="flex h-full min-h-0 shrink-0 items-stretch"
    >
      {state === 'meters' || density === 'mini' ? (
        /* A6: the mini-density fallback carries the blocked flag so the
           expand control renders honestly disabled (the container would
           pure-render this surface regardless of the store write). */
        <MetersDock expandBlocked={density === 'mini'} />
      ) : (
        <FullDock density={density} tier={mixerTierFor(H ?? MIXER_TIER.FULL)} />
      )}
    </div>
  );
}

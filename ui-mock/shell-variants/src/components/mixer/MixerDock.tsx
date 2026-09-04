/* MixerDock — the mixer surface docked to the RIGHT of the multi-track
   lanes (design doc v2.2 §4, user direction: "side by side with
   multi-track", not a short row under the timeline).

   Three states (same store state machine as the old MixerRow):
   - collapsed: not rendered.
   - bridge: a 44px meter-bridge RAIL — one vertical stereo meter per
     audio track + a master cluster (meter, mute, collapse) pinned bottom.
   - full: a classic channel-strip row — vertical strips side by side
     (one per audio track + 2 aux returns + master), filling the full
     height the timeline area gives the dock.

   Because the dock shares the timeline area's height, strips get real
   fader room (the old 176px row crammed them). Per-track M/S/L in the
   bridge state is intentionally dropped — the rail is a glance-level
   surface and the track headers carry the same store commands at the
   same height. F6-region: the dock joins the focus cycle as the 7th
   region (registered in AppShell). */

import { useEffect, useRef, useState } from 'react';
import { AudioLines, ChevronsRight } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { ChannelStrip, AuxStrip, MasterStrip } from './ChannelStrip';
import { StripMeter } from './MixerPrimitives';

/* ---------- bridge rail (44px, vertical meters) ---------- */
function BridgeRail() {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const mixer = useUi((s) => s.mixer);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const toggleMasterMute = useUi((s) => s.toggleMasterMute);
  const cycleMixerState = useUi((s) => s.cycleMixerState);
  const audio = scene.tracks.filter((t) => t.kind === 'audio');

  return (
    <div
      className="flex h-full w-[44px] shrink-0 flex-col border-l border-hairline bg-shell"
      data-testid="mixer-dock-bridge"
      role="group"
      aria-label="Mixer meter bridge"
    >
      <div className="flex shrink-0 justify-center border-b border-hairline py-[3px]">
        <span className="mono text-[10px] font-semibold uppercase tracking-wide text-tfaint">MIX</span>
      </div>
      {/* per-track vertical meters — each track flexes an equal share */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-1 py-1">
        {audio.map((t) => {
          const strip = mixer.tracks[t.id];
          return (
            <div key={t.id} className="flex min-h-[30px] flex-1 flex-col items-center gap-0.5" data-testid={`bridge-${t.badge}`}>
              <span className="mono text-[10px] font-semibold text-[var(--type-audio)]">{t.badge}</span>
              <StripMeter
                trackId={t.id}
                db={strip?.fader ?? -6}
                duckAmount={mixer.ducking[t.id]?.amount ?? 0}
                fillHeight
                label={t.name}
              />
            </div>
          );
        })}
      </div>
      {/* master cluster pinned to the rail bottom — same store values as
          the toolbar/strip masters (design doc §4.5 single source) */}
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-hairline px-1 py-1.5">
        <span className="mono text-[10px] font-semibold uppercase tracking-wide text-tprimary">MST</span>
        <StripMeter trackId="master-bridge" db={masterMuted ? -60 : masterVolume * 66 - 60} height={36} width={4} label="Master" />
        <button
          onClick={toggleMasterMute}
          aria-pressed={masterMuted}
          aria-label="Master mute"
          className={`mono flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border text-[10px] font-bold ${masterMuted ? 'border-[var(--mute-warn)] bg-[var(--mute-warn)] text-black' : 'border-strong bg-inset text-tmuted'}`}
        >M</button>
        <button
          className="icon-btn icon-btn-sm"
          onClick={() => cycleMixerState()}
          data-tip="Collapse mixer"
          aria-label="Collapse mixer rail"
        >
          <ChevronsRight size={12} strokeWidth={1.7} />
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
  const audio = scene.tracks.filter((t) => t.kind === 'audio');
  const [flashOn, setFlashOn] = useState(false);

  // compact when the timeline area gets short (main-body drag) — strips drop
  // inserts/sends/ducking and slim down, the fader room survives
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setCompact(el.offsetHeight < 260));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      className="flex h-full min-h-0 max-w-[60%] shrink-0 items-stretch overflow-x-auto border-l border-hairline bg-shell"
      data-testid="mixer-dock-full"
      role="group"
      aria-label="Audio mixer"
    >
      {/* dock header — vertical label + collapse control */}
      <div className="relative flex w-[22px] shrink-0 flex-col items-center justify-between border-r border-hairline py-1.5">
        <button
          onClick={() => cycleMixerState()}
          className="icon-btn icon-btn-sm"
          data-tip="Collapse mixer"
          aria-label="Collapse mixer dock"
        >
          <ChevronsRight size={12} strokeWidth={1.7} />
        </button>
        <span
          className="mono select-none text-[10px] font-semibold uppercase tracking-[0.18em] text-tfaint"
          style={{ writingMode: 'vertical-rl' }}
          aria-hidden="true"
        >
          MIXER · G-LAYER
        </span>
        <AudioLines size={11} strokeWidth={1.6} className="text-tfaint" aria-hidden="true" />
      </div>
      {audio.map((t) => (
        <ChannelStrip
          key={t.id}
          track={t}
          sceneId={scene.id}
          compact={compact}
          focused={stripFocus === t.id}
          flashing={flashOn && stripFocus === t.id}
          onStripClick={() => setStripFocus(t.id)}
        />
      ))}
      <AuxStrip bus="a1" compact={compact} />
      <AuxStrip bus="a2" compact={compact} />
      <MasterStrip compact={compact} />
    </div>
  );
}

/* ---------- the 3-state container ---------- */
export function MixerDock() {
  const mixerState = useUi((s) => s.mixerState);
  if (mixerState === 'collapsed') return null;
  return mixerState === 'bridge' ? <BridgeRail /> : <FullDock />;
}

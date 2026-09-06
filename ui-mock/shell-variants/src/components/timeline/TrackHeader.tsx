/* TrackHeader — spec 05 §10 / 18 §4.7: badge + name, per-track M/S/L(/V)
   buttons → track commands. Reference grammar (davinci mock): tall lanes get
   TWO rows (row 1: badge + name + meta; row 2: controls), short lanes get a
   single compact control row — everything fits the fixed 160px column with
   no horizontal overflow. */

import { Lock, Eye, EyeOff, Volume2, VolumeX, Headphones, Activity, SlidersHorizontal } from 'lucide-react';
import { useRef } from 'react';
import { useUi } from '../../state/useUiStore';
import type { TrackJSON } from '../../lib/mockData';
import { dbToSlider, sliderToDb } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';
import { CAPTION_PARCHMENT } from './Clip';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';

// single source of truth: the undoable store command (headers, strips, bridge)
const toggleTrack = (sceneId: string, trackId: string, field: 'muted' | 'solo' | 'locked' | 'visible' | 'waveform') =>
  useUi.getState().toggleTrackCmd(sceneId, trackId, field);

/* R20-W5 (thread #58 / D1.5, gap C57): per-track resize-strip constants. The
   store's setTrackHeight is the single owner of the clamp [min, 240] — these
   mirrors exist so the strip's keyboard Home/End and the drag preview can
   aim without a store round-trip (same values, pinned by tests).
   The strip itself is 5px (the mission's figure; timeline-cluster thread-4
   §4b drew 6px — registered in the README deviation list). */
const RESIZE_STRIP_H = 5;
const trackMinHeight = (kind: TrackJSON['kind']) => (kind === 'caption' ? 32 : 24);
const TRACK_MAX_HEIGHT = 240;

/* R15-A4 — audio track-header micro-meter (v2.2 §3.2 promise, never
   implemented until now): a 4px view-only vertical level display fed by the
   SHARED metering engine — the same useMeter(trackId) key the channel
   strips / bridge rail read, so the header and the strip can never disagree.
   Zero interaction: aria-hidden, pointer-events-none. No LED segments (a 4px
   column can't carry them) and mono-collapsed to the louder channel; clip
   latches red like the strip meters; effectiveMute dims it.
   Compact-safe: rendered ONLY on tall lanes (height ≥ 48) — the compact
   single-row layout has no vertical room for a readable level display
   (documented judgment; the mixer dock + toolbar master micro remain the
   glance sources there). */
function HeaderMicroMeter({ trackId, badge }: { trackId: string; badge: string }) {
  const snap = useMeter(trackId);
  const level = Math.max(snap.l.level, snap.r.level);
  const clipped = snap.l.clipped || snap.r.clipped;
  const pct = Math.round(level * 10000) / 100;
  return (
    <div
      data-testid={`track-micrometer-${badge}`}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-[3px] right-0 w-[4px] select-none overflow-hidden rounded-[1px] bg-[var(--meter-well)] ${snap.muted ? 'opacity-20' : ''}`}
    >
      <div
        data-testid={`track-micrometer-${badge}-fill`}
        className="absolute inset-x-0 bottom-0 h-full"
        style={{
          background: clipped
            ? 'var(--meter-red)'
            : 'linear-gradient(to top, var(--meter-green) 0%, var(--meter-amber) 70%, var(--meter-red) 90%)',
          clipPath: `inset(${100 - pct}% 0 0 0)`,
        }}
      />
    </div>
  );
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
  const audioFocus = useUi((s) => s.page === 'audio');
  const strip = useUi((s) => s.mixer.tracks[track.id]);
  const setMixerTrack = useUi((s) => s.setMixerTrack);
  const addTrack = useUi((s) => s.addTrack);
  const trackHeightPref = useUi((s) => s.trackHeightPref);
  const setTrackHeightPref = useUi((s) => s.setTrackHeightPref);
  /* R20-W5 (thread #58): the per-track override surface — setTrackHeight
     (view state, no history) + the resize strip's drag/keyboard math. */
  const trackHeightOverrides = useUi((s) => s.trackHeightOverrides);
  const setTrackHeight = useUi((s) => s.setTrackHeight);
  const audioLaneBoost = useUi((s) => s.audioLaneBoost);
  const hasOverride = trackHeightOverrides[track.id] != null;
  const focused = useUi((s) => s.focusedTrackId === track.id);
  const setFocusedTrack = useUi((s) => s.setFocusedTrack);
  const selectTrack = useUi((s) => s.selectTrack);
  const menu = useContextMenu(); // §4.9 track-header menu

  /* R20-W5 (thread #58): the drag/keyboard SEED — the display height prop
     inverted through the boost (audio ÷1.6 in audio focus; main/overlay caps
     yield, the documented rule). No boost → the display IS the override-or-
     auto value, so the seed is exact; boosted audio is exact to the rounding;
     capped lanes seed at the cap (growing past it stays invisible until the
     boost lifts — the yield rule). Derived per render — no clipStyle lookup
     needed (the header never needs the kind base; the store clamps anyway). */
  const seedHeight = audioLaneBoost && track.kind === 'audio' ? height / 1.6 : height;
  const currentHeight = () => trackHeightOverrides[track.id] ?? seedHeight;
  /* R20-W5 resize strip gesture state: `seed` = the override-space height at
     pointerdown (accumulated); `last` = the last clientY (incremental dy —
     the splitter's pattern). Display dy maps back through the boost so the
     lane follows the pointer 1:1 on boosted lanes. */
  const resizeSeed = useRef<number | null>(null);
  const resizeLast = useRef<number | null>(null);
  const resizeStep = (dir: 1 | -1, shift: boolean) =>
    setTrackHeight(track.id, currentHeight() + dir * 4 * (shift ? 4 : 1));

  /* §4.9 track-header menu — direct toggles reuse the module-level
     toggleTrack helper (the M/S/L buttons use it too). "Delete track" is
     honestly disabled: the mock store has no deleteTrack command, so the
     §6.4 with-clips confirmation has no real path here (deleteScene + the
     clip-menu multi-delete carry the confirm consumers instead).
     R19 caption tracks: add-above/below routes addTrack('caption') — the
     store mints a "Video n"/"Vn" name/badge for non-audio/overlay kinds.
     R19-TODO(orchestrator): addTrack needs a caption branch (name
     "Captions n", badge "CC") — store file is off-limits this wave. */
  const isCaption = track.kind === 'caption';
  const kindLabel = track.kind === 'main' ? 'video' : track.kind === 'overlay' ? 'text' : track.kind === 'caption' ? 'caption' : 'audio';
  const buildMenuItems = (): MenuItem[] => [
    /* §4.9 add-track above/below: explicit insertion at THIS header's index —
       user direction wins over the spec 05 §12.1 kind-ordering law (which
       governs the default no-position route only; see the store's addTrack). */
    { id: 'add-above', label: `Add ${kindLabel} track above`, onSelect: () => addTrack(track.kind, 'above', track.id) },
    { id: 'add-below', label: `Add ${kindLabel} track below`, onSelect: () => addTrack(track.kind, 'below', track.id) },
    /* §4.9 Height rows (spec 18 §4.9 "Height: Compact/Normal/Tall — (UI)
       pref"): single-choice group — ContextMenu renders checked items as
       menuitemcheckbox (no radio role in its vocabulary; mock-level
       acceptable). null = auto → no row checked. The pref is GLOBAL (all
       lanes), the mock's answer to the B3 state-home seal item. */
    { id: 'height-compact', label: 'Height: Compact', checked: trackHeightPref === 'compact', sep: true, onSelect: () => setTrackHeightPref('compact') },
    { id: 'height-normal', label: 'Height: Normal', checked: trackHeightPref === 'normal', onSelect: () => setTrackHeightPref('normal') },
    { id: 'height-tall', label: 'Height: Tall', checked: trackHeightPref === 'tall', onSelect: () => setTrackHeightPref('tall') },
    /* R20-W5 (thread #58): per-track reset — enabled only while THIS track
       carries an override (checked mirrors the custom state); the strip's
       double-click runs the same reset. */
    {
      id: 'height-reset-track',
      label: 'Height: Reset to auto',
      checked: hasOverride,
      disabled: !hasOverride,
      tip: hasOverride ? 'per-track height back to the kind default' : 'this track is already at its auto height',
      onSelect: () => setTrackHeight(track.id, null),
    },
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
    <span
      className={`mono flex h-[20px] w-[30px] shrink-0 items-center justify-center rounded-[2px] border text-[11px] font-semibold ${isCaption ? '' : badgeCls}`}
      /* R19: caption tracks badge in the parchment chip identity (CC) —
         inline style (Tailwind can't take the imported constant as a class) */
      style={isCaption ? { borderColor: CAPTION_PARCHMENT, color: CAPTION_PARCHMENT } : undefined}
    >
      {track.badge}
    </span>
  );

  const meta = track.kind === 'audio' ? '48 kHz' : track.kind === 'main' ? '1920×1080' : isCaption ? (track.language ? track.language.toUpperCase() : 'CC') : 'text';

  /* R19 clip counts (reference §2.5 “V2 · 7 clips” / task): small dim text
     under the name for TALL headers (caption counts in “N captions”);
     the 32px caption header is always the compact single row, so its count
     rides the right edge instead (title attr keeps the info in compact
     non-caption headers — no room there, documented judgment). */
  const nClips = track.elements.length;
  const countLabel = isCaption
    ? `${nClips} ${nClips === 1 ? 'caption' : 'captions'}`
    : `${nClips} ${nClips === 1 ? 'clip' : 'clips'}`;

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
      className={`relative flex shrink-0 flex-col justify-center gap-[3px] border-b border-hairline bg-raised px-2 ${focused ? 'shadow-[inset_2px_0_0_0_var(--accent-selection)]' : ''}`}
      style={{ height, minHeight: height, overflow: 'hidden' }}
      data-testid={`shell-track-header-${track.id}`}
      title={`${track.name} · ${meta}${isCaption ? '' : ` · ${countLabel}`}`}
      aria-current={focused ? 'true' : undefined} /* the focused track — ↑/↓ move this focus */
      tabIndex={-1} /* focusable host for the §4.9 Shift+F10 keyboard route */
      onPointerDown={() => {
        /* pointer focus feeds the ↑/↓ / ⌘A / ⌘M focused-track family —
           setFocusedTrack was store-surface-only before (R14 no-op sweep) */
        if (useUi.getState().focusedTrackId !== track.id) setFocusedTrack(track.id);
      }}
      onClick={(e) => {
        /* R20-W3 (D4.2): the header's NON-INTERACTIVE residue (name / clip-
           count / lane area — NOT the M/S/L/V/W buttons, fader or menu) selects
           the track: focus (onPointerDown above) + selectTrack. The store law
           clears the clip selection + marker/effect domains (one domain at a
           time) and the inspector rail swaps to the TrackSheet. */
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, [role="menu"]')) return;
        if (useUi.getState().selectedTrackId !== track.id) selectTrack(track.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).focus();
        menu.open(e.clientX, e.clientY, buildMenuItems(), 'track');
      }}
      onKeyDown={(e) => {
        /* fires for focus on the header itself OR any of its M/S/L buttons
           (keydown bubbles to this host) — the select-track key route only
           applies to the HEADER itself so Enter on a button stays a toggle */
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          selectTrack(track.id);
          return;
        }
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
          {/* R19 clip count — dim 10px line under the name (reference
              “V2 · 7 clips”, task spec “N clips / N captions, dim 10px”);
              hidden in audio focus (the minifader row takes the room) and for
              caption tracks (right-edge count below). */}
          {!isCaption && !audioFocus && (
            <div className="mono flex w-full items-center gap-1 pl-[36px] text-[10px] text-tfaint" data-testid={`track-clip-count-${track.badge}`}>
              {countLabel}
            </div>
          )}
          <div className="flex w-full items-center gap-1">
            {controls}
            <div className="grow" />
          </div>
          {audioFocus && track.kind === 'audio' && (
            <div className="flex w-full items-center gap-1.5" data-testid={`track-minifader-${track.badge}`}>
              <Volume2 size={9} className="shrink-0 text-tfaint" aria-hidden="true" />
              <input
                type="range" min={0} max={100} step={1}
                value={Math.round(dbToSlider(strip?.fader ?? -6) * 100)}
                onChange={(e) => setMixerTrack(track.id, { fader: sliderToDb(+e.target.value / 100) })}
                className="h-[8px] min-w-0 flex-1 green-fill"
                style={{ ['--fill' as any]: `${Math.round(dbToSlider(strip?.fader ?? -6) * 100)}%` }}
                aria-label={`${track.name} gain (G layer)`}
              />
              <button
                className="icon-btn !h-[14px] !w-[14px] shrink-0"
                data-tip="Automation lane — M2 (spec 20 §12.1)"
                aria-label="Automation lane placeholder"
                aria-disabled="true" /* honesty contract: no local mutation possible (M2 audio path) — the tip explains */
                data-testid={`track-automation-${track.badge}`}
              >
                <SlidersHorizontal size={9} strokeWidth={1.6} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* compact single row: badge + controls; name via title attr */
        <div className="flex w-full items-center gap-1.5">
          {badge}
          {controls}
          {track.solo && <Headphones size={10} className="shrink-0 text-[var(--solo)]" aria-label="Solo active" />}
        </div>
      )}
      {/* R19: caption header count — the 32px Sub-lane header is always the
          compact row; the “N captions” count rides the right edge (dim 10px,
          view-only, clear of the badge + M/S/L/V controls). */}
      {isCaption && (
        <span className="mono pointer-events-none absolute bottom-[2px] right-2 text-[10px] text-tfaint" data-testid={`track-clip-count-${track.badge}`}>
          {countLabel}
        </span>
      )}
      {/* A4: view-only audio micro-meter on the tall header's right edge —
          see HeaderMicroMeter for the compact-safety note */}
      {track.kind === 'audio' && tall && <HeaderMicroMeter trackId={track.id} badge={track.badge} />}
      {/* ---- R20-W5 (thread #58 / D1.5, gap C57): the per-track RESIZE STRIP —
           a 5px strip pinned INSIDE the header's overflow:hidden box at its
           bottom edge. Grammar cloned from the app splitter (AppShell.tsx):
           pointer-capture drag, arrows ±4px (⇧ ×4 = 16px), Home/End = MIN/MAX,
           double-click reset, role=separator + own tab stop (the APG-honest
           resizable path — one extra stop per track, documented). Display dy
           maps back through the audio-focus boost (audio ÷1.6) so the STORE
           value follows the pointer 1:1 on boosted lanes. The 2px hover
           hairline goes accent on group-hover (the splitter's rail law). ---- */}
      <div
        data-testid={`track-resize-${track.id}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label={`Track height ${track.name}`}
        tabIndex={0}
        className="group/resize absolute inset-x-0 bottom-0 z-[2] cursor-ns-resize"
        style={{ height: RESIZE_STRIP_H }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* inactive pointer id (R15-A5 guard) */ }
          resizeSeed.current = currentHeight();
          resizeLast.current = e.clientY;
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1 || resizeSeed.current === null) return;
          /* display px → override: audio lanes carry the ×1.6 boost in audio
             focus — divide it out so the lane follows the pointer exactly;
             main/overlay caps yield (a custom >cap lane holds its stored
             value; the documented yield rule) */
          const dy = e.clientY - (resizeLast.current ?? e.clientY);
          resizeLast.current = e.clientY;
          const dyo = audioLaneBoost && track.kind === 'audio' ? dy / 1.6 : dy;
          resizeSeed.current += dyo;
          setTrackHeight(track.id, resizeSeed.current);
        }}
        onPointerUp={() => { resizeSeed.current = null; resizeLast.current = null; }}
        onPointerCancel={() => { resizeSeed.current = null; resizeLast.current = null; }}
        onLostPointerCapture={() => { resizeSeed.current = null; resizeLast.current = null; }}
        onDoubleClick={() => setTrackHeight(track.id, null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); resizeStep(-1, e.shiftKey); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); resizeStep(1, e.shiftKey); }
          else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); setTrackHeight(track.id, trackMinHeight(track.kind)); }
          else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); setTrackHeight(track.id, TRACK_MAX_HEIGHT); }
        }}
      >
        <div className="pointer-events-none flex h-full items-center justify-center">
          <div className="h-px w-[96%] bg-hairline transition-colors group-hover/resize:bg-accent" />
        </div>
      </div>
      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}

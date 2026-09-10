/* ChannelEditor — the Audio-focus inspector swap (design doc §3.2): two
   sections that literally display the S/G seam. CLIP section = the selected
   element's audio fields (the SAME fields as the inspector Audio tab — 17
   §6.1 parity, one command set). TRACK section = the focused track's G strip
   in detail: fader/pan/inserts/sends/output bus + the duck-under row.
   Mock-level: G values live in the mockMixer sidecar, element fields in the
   doc slice.

   R19-B1 (th_mto37ze9): the TRACK section's fader block is now the
   TERMINAL flex-1 element — [meter | fader+scale] fills ALL remaining
   vertical space flush to the panel bottom (was a fixed 84px fader with
   ~50% dead rail below), with the same equal-height law as the strips:
   one SHARED 24px headroom readout (fader dB signed 1dp no unit + live
   peak) above meter/fader columns sharing one height var. The aux
   pre/post tap point moved here from the strip (the reference strip has
   no sends surface — R19-B1 report note).

   R23-WC (DESIGN-R23 Part III, #98 + #99): D-C1 — every CLIP param row
   (Gain / Fade in / Fade out) now carries the UNIFORM row grammar (label +
   control + live readout — the W2 insert-row grammar extended with the
   typed field), killing #98's "only gain has a dialer and the other two
   are empty" strangeness. D-C2 — the no-clip state DIES as a complaint:
   with a strip focus live the CLIP section hides entirely (no empty hole
   — the focused channel IS the content), and only when NEITHER a clip
   nor a channel focus is live does the honest onboarding line appear
   ("Select a clip or focus a channel"). */

import { useState } from 'react';
import { Volume2, Music2, Waves, AudioLines, Trash2 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { mediaById, type ElementJSON } from '../../lib/mockData';
import { ROLE_LABEL, dbLabel, type Role } from '../../state/mockMixer';
import { useMeter } from '../../lib/meterEngine';
import { Fader, PanKnob, StripMeter, HeadroomReadout, FaderGridlines } from './MixerPrimitives';
/* R23-FIX (review-sweep item 6, R2-F4): the SHARED dB↔linear map + domain
   bounds from the Inspector (the one map for ElementJSON.volume — the old
   local linear mapping ((v·20)−20 / (db+20)/20) contradicted the
   Inspector's log law on the SAME field). */
import { volToDb, dbToVol, VOL_DB_MIN, VOL_DB_MAX } from '../shell/Inspector';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="w-[52px] shrink-0 text-[11px] text-tmuted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

/* R22 #81: per-insert param rows — honest view-state mocks (gap C60). One
   state per trackId+kind so switching slots keeps the edits. */
const INSERT_PARAM_DEFAULTS: Record<string, { key: string; label: string; min: number; max: number; step: number; fmt: (v: number) => string; init: number }[]> = {
  EQ: [
    { key: 'low', label: 'Low', min: -12, max: 12, step: 0.5, fmt: (v) => v.toFixed(1) + ' dB', init: 0 },
    { key: 'mid', label: 'Mid', min: -12, max: 12, step: 0.5, fmt: (v) => v.toFixed(1) + ' dB', init: 0 },
    { key: 'high', label: 'High', min: -12, max: 12, step: 0.5, fmt: (v) => v.toFixed(1) + ' dB', init: 0 },
  ],
  Comp: [
    { key: 'thresh', label: 'Thresh', min: -60, max: 0, step: 1, fmt: (v) => v + ' dB', init: -24 },
    { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5, fmt: (v) => v.toFixed(1) + ':1', init: 4 },
    { key: 'attack', label: 'Attack', min: 0, max: 100, step: 1, fmt: (v) => v + ' ms', init: 10 },
  ],
  Gate: [
    { key: 'thresh', label: 'Thresh', min: -80, max: 0, step: 1, fmt: (v) => v + ' dB', init: -50 },
    { key: 'release', label: 'Release', min: 5, max: 500, step: 5, fmt: (v) => v + ' ms', init: 100 },
  ],
  'De-esser': [
    { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, fmt: (v) => v + '%', init: 35 },
    { key: 'freq', label: 'Freq', min: 2000, max: 9000, step: 100, fmt: (v) => (v / 1000).toFixed(1) + ' kHz', init: 5500 },
  ],
};

const insertParamsStore: Record<string, Record<string, number>> = {};

function InsertParams({ trackId, kind, badge }: { trackId: string; kind: string; badge: string }) {
  const defs = INSERT_PARAM_DEFAULTS[kind];
  const [params, setParams] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    defs.forEach((d) => { base[d.key] = d.init; });
    return { ...base, ...insertParamsStore[`${trackId}:${kind}`] };
  });
  const set = (key: string, v: number) => {
    setParams((p) => ({ ...p, [key]: v }));
    insertParamsStore[`${trackId}:${kind}`] = { ...insertParamsStore[`${trackId}:${kind}`], [key]: v };
  };
  return (
    <div className="mb-1 flex flex-col gap-[2px] pl-1" data-testid={`channel-insert-params-${badge}-${kind}`}>
      {defs.map((d) => (
        <div key={d.key} className="flex items-center gap-2">
          <span className="w-[52px] shrink-0 pl-2 text-[10px] text-tfaint">{d.label}</span>
          <input
            type="range"
            min={d.min}
            max={d.max}
            step={d.step}
            value={params[d.key]}
            onChange={(e) => set(d.key, +(e.target as HTMLInputElement).value)}
            aria-label={`${kind} ${d.label} for ${badge}`}
            className="h-[9px] min-w-0 flex-1"
          />
          <span className="mono w-[52px] shrink-0 text-right text-[10px] text-tmuted">{d.fmt(params[d.key])}</span>
        </div>
      ))}
    </div>
  );
}

function NumField({ value, min, max, step = 0.1, onCommit, ariaLabel }: {
  value: number; min: number; max: number; step?: number; onCommit: (v: number) => void; ariaLabel: string;
}) {
  /* uncontrolled by design (§4.4-style commit-on-blur); callers MUST key the
     usage on the element id — React reuses the instance across selection
     changes otherwise, and the stale defaultValue of the PREVIOUS clip would
     both display and commit to the newly selected clip (R13 CodeRabbit fix). */
  return (
    <input
      type="number"
      className="field mono w-[64px] text-[11px]"
      defaultValue={value}
      min={min} max={max} step={step}
      aria-label={ariaLabel}
      onBlur={(e) => { const v = +e.target.value; if (!Number.isNaN(v) && v >= min && v <= max) onCommit(v); else e.target.value = String(value); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

/* R23-WC (D-C1, #98 — the uniform row grammar): every CLIP param row =
   [label 52px] [NumField] [slider flex-1] [readout 52px] — one anatomy for
   Gain / Fade in / Fade out (the Inspector ParamRow's label + slider +
   typed-field law, plus the W2 insert-row readout; the old gain-only dialer
   + empty fade slots were #98's "strange layout"). The READOUT follows the
   slider drag live via local preview state; the store commits once per
   gesture (release/keyup/blur — the §4.4 single-write law, same as the old
   inline slider). The NumField stays keyed on the element id (the R13
   stale-defaultValue fix).
   R24-W5a (DESIGN-R24 §2 F2-P2 — the focus drop): the slider used to
   re-key on the VALUE (key={`${keyId}-${label}-${value}`}) so external
   writes would resync its uncontrolled defaultValue — but a single
   ArrowRight commit changed the value → React UNMOUNTED the focused
   slider and remounted a fresh one → document.activeElement fell to
   <body>. The key is now STABLE (param identity, like the row's own
   testid) and the slider is CONTROLLED (value={shown}, the Inspector
   ParamRow's exact grammar): external writes (undo, NumField commit)
   resync through the value prop — no remount, focus survives the commit. */
function ClipParamRow({ label, value, min, max, step, fmt, keyId, numAria, sliderAria, onCommit }: {
  label: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; keyId: string; numAria: string; sliderAria: string;
  onCommit: (v: number) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const commitDrag = (e: React.PointerEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    const raw = +(e.target as HTMLInputElement).value;
    setDrag(null);
    onCommit(raw);
  };
  return (
    <div className="flex items-center gap-2 py-[3px]" data-testid={`channel-clip-row-${keyId}-${label}`}>
      <span className="w-[52px] shrink-0 text-[11px] text-tmuted">{label}</span>
      <NumField key={keyId} value={value} min={min} max={max} step={step} ariaLabel={numAria} onCommit={onCommit} />
      <input
        type="range"
        min={min} max={max} step={step}
        value={shown}
        key={`${keyId}-${label}`}
        className="h-[10px] min-w-0 flex-1"
        onChange={(e) => setDrag(+(e.target as HTMLInputElement).value)}
        onPointerUp={commitDrag}
        onPointerCancel={() => setDrag(null)}
        onKeyUp={commitDrag}
        aria-label={sliderAria}
      />
      <span data-testid={`channel-clip-readout-${label}`} className="mono w-[52px] shrink-0 text-right text-[10px] text-tmuted">{fmt(shown)}</span>
    </div>
  );
}

export function ChannelEditor() {
  const scene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const selection = useUi((s) => s.selection);
  const setElementField = useUi((s) => s.setElementField);
  const mixer = useUi((s) => s.mixer);
  const stripFocus = useUi((s) => s.stripFocus);
  const setMixerTrack = useUi((s) => s.setMixerTrack);
  const setDucking = useUi((s) => s.setDucking);
  const setAuxBus = useUi((s) => s.setAuxBus);

  // CLIP section: first selected audio-bearing element
  const allEls = scene.tracks.flatMap((t) => t.elements.map((e) => ({ e, t })));
  const sel = allEls.find(({ e }) => selection.includes(e.id) && (e.type === 'audio' || e.type === 'video'));
  const el: ElementJSON | undefined = sel?.e;

  // TRACK section: focused strip (or the first audio track)
  const audioTracks = scene.tracks.filter((t) => t.kind === 'audio');
  const track = audioTracks.find((t) => t.id === stripFocus) ?? audioTracks[0];
  /* R23-WC (D-C2, #99): the focus is LIVE only when stripFocus actually
     resolves to an audio track in this scene — the first-track fallback
     below is display, not focus (so the CLIP section's onboarding line can
     distinguish "focused channel owns the editor" from "nothing live"). A
     stale id (scene switch, deleted track) resolves to nothing here. */
  const stripLive = stripFocus != null && audioTracks.some((t) => t.id === stripFocus);
  const strip = track ? mixer.tracks[track.id] : undefined;
  const role = track ? (mixer.roles[track.id] as Role | undefined) : undefined;
  const duck = track ? mixer.ducking[track.id] : undefined;

  // the editor's engine view for the headroom peak readout (same key as the
  // strip/bridge meters — one engine, N views; idle key when no track)
  const meter = useMeter(track?.id ?? 'channel-editor-idle');
  const peak = Math.max(meter.l.peakDb, meter.r.peakDb);

  return (
    <div data-testid="shell-channel-editor" className="scroll-y flex h-full w-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-2">
        <AudioLines size={12} className="text-accent" />
        <span className="text-[11px] font-semibold text-tprimary">Channel editor</span>
        <span className="ml-auto text-[10px] text-tfaint">S + G layers</span>
      </div>

      {/* ---------- CLIP section (S-layer element fields) ----------
          R23-WC (D-C1 zero-param law + D-C2, #98/#99): the section HIDES
          entirely when no clip is selected AND a channel focus is live (the
          focused channel IS the editor's content — no empty hole, no
          "clip not selected" complaint); the honest onboarding line renders
          only when NEITHER a clip nor a focus is live. */}
      {el || !stripLive ? (
        <div className="border-b border-hairline px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">Clip</span>
            <span className="text-[10px] text-tfaint">· structure layer</span>
          </div>
          {el ? (
            <div className="flex flex-col">
              <div className="mb-1 flex items-center gap-1.5">
                {el.type === 'audio' ? <Waves size={11} className="text-[var(--type-audio)]" /> : <Music2 size={11} className="text-[var(--type-video)]" />}
                <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{el.name}</span>
              </div>
              {/* R23-FIX (item 6, R2-F4): the gain row rides the SHARED log
                  map + the Inspector's −24..+12 domain (was a linear
                  (v·20)−20 map over −48..+12 — the contradictory-law bug).
                  dbToVol(−24) ≈ 0.063 so the floor never writes ~0. */}
              <ClipParamRow
                label="Gain dB"
                keyId={el.id}
                value={volToDb(el.volume ?? 1)}
                min={VOL_DB_MIN} max={VOL_DB_MAX} step={0.5}
                fmt={(dbv) => dbv.toFixed(1) + ' dB'}
                numAria="Clip gain"
                sliderAria="Clip gain slider (commit on release)"
                onCommit={(dbv) => setElementField(el.id, { volume: dbToVol(dbv) })} />
              <ClipParamRow
                label="Fade in"
                keyId={el.id}
                value={el.audioFadeIn ?? 0}
                min={0} max={10} step={0.1}
                fmt={(v) => v.toFixed(1) + ' s'}
                numAria="Audio fade in"
                sliderAria="Audio fade in slider (commit on release)"
                onCommit={(v) => setElementField(el.id, { audioFadeIn: v })} />
              <ClipParamRow
                label="Fade out"
                keyId={el.id}
                value={el.audioFadeOut ?? 0}
                min={0} max={10} step={0.1}
                fmt={(v) => v.toFixed(1) + ' s'}
                numAria="Audio fade out"
                sliderAria="Audio fade out slider (commit on release)"
                onCommit={(v) => setElementField(el.id, { audioFadeOut: v })} />
              <p className="mt-1 text-[10px] leading-[1.4] text-tfaint">
                Same fields and commands as the inspector Audio tab (spec 17 §6.1 parity). Strip fader ≠ clip gain — different layers.
              </p>
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] text-tfaint" data-testid="shell-channel-editor-state-noclip">
              Select a clip or focus a channel
            </p>
          )}
        </div>
      ) : null}

      {/* ---------- TRACK section (G-layer strip params) ----------
          R19-B1: terminal flex-1 — the detail stack scrolls, the fader block
          fills ALL remaining vertical space flush to the panel bottom */}
      <div className="flex min-h-0 flex-1 flex-col px-2.5 py-2">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">Track</span>
          <span className="text-[10px] text-tfaint">· signal layer</span>
          {role && <span className="ml-auto rounded-[2px] border border-hairline bg-inset px-1 text-[10px] font-semibold uppercase text-tmuted">{ROLE_LABEL[role]}</span>}
        </div>
        {track && strip ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className="mono flex h-[18px] w-[28px] items-center justify-center rounded-[2px] border border-[var(--type-audio)] text-[11px] font-semibold text-[var(--type-audio)]">{track.badge}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{track.name}</span>
            </div>
            <div className="flex min-h-0 flex-1 gap-2">
              {/* detail stack — the aux/insert/bus/ducking editing that moved
                  off the strips (the reference strip has no sends surface;
                  R19-B1) */}
              <div className="scroll-y flex min-h-0 min-w-0 flex-1 flex-col gap-1">
                <Row label="Fader"><span className="mono text-[11px] text-tprimary">{dbLabel(strip.fader)}</span></Row>
                <div className="flex items-center gap-2 py-1">
                  <span className="w-[52px] shrink-0 text-[11px] text-tmuted">Pan</span>
                  <PanKnob pan={strip.pan} onChange={(pan) => setMixerTrack(track.id, { pan })} ariaLabel={`${track.name} pan`} />
                </div>
                {/* R22 (#81 + #72: "where do the EQ / FX slots go then? we
                    should have inspector surface these at the very least" /
                    "perhaps FX / EQ stuff can fall under here?"): the insert
                    slots + their PARAM rows live HERE — the strips stay lean
                    length-aligned chrome. Params are honest view-state mocks
                    (gap C60: the G-slice has no insert params; the engine EQ
                    seam lands later) — they persist per track+kind while the
                    editor is mounted and are never snapshotted. */}
                <div className="mt-1 flex flex-col rounded-[var(--radius)] border border-hairline bg-inset px-2 py-1.5" data-testid={`channel-inserts-${track.badge}`}>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <AudioLines size={11} className="text-[var(--type-audio)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-tmuted">EQ / FX inserts</span>
                    <span className="ml-auto text-[9px] text-tfaint" data-tip="Insert params are view-state mocks (gap C60) — the G-slice has no param fields; the engine EQ seam lands with the engine round">params: mock</span>
                  </div>
                  {([1, 2] as const).map((slot) => {
                    const kind = strip.inserts[slot - 1];
                    return (
                      <div key={slot} className="flex flex-col">
                        <Row label={`Ins ${slot}`}>
                          <select aria-label={`Insert slot ${slot}`} className="field min-w-0 flex-1 cursor-pointer px-1 py-0 text-[10px]"
                            value={kind ?? ''} onChange={(e) => setMixerTrack(track.id, { inserts: slot === 1 ? [e.target.value || null, strip.inserts[1]] : [strip.inserts[0], e.target.value || null] })}>
                            <option value="">—</option>
                            <option value="EQ">EQ</option><option value="Comp">Comp</option><option value="Gate">Gate</option><option value="De-esser">De-esser</option>
                          </select>
                        </Row>
                        {kind && <InsertParams trackId={track.id} kind={kind} badge={track.badge} />}
                      </div>
                    );
                  })}
                </div>
                <Row label="Bus">
                  <select aria-label="Output bus" className="field min-w-0 flex-1 cursor-pointer px-1 py-0 text-[10px]"
                    value={strip.outputBus} onChange={(e) => setMixerTrack(track.id, { outputBus: +e.target.value as 0 | 1 | 2 })}>
                    <option value={0}>Master</option><option value={1}>A1 {mixer.buses.a1.name}</option><option value={2}>A2 {mixer.buses.a2.name}</option>
                  </select>
                </Row>
                <Row label="A1 send">
                  <input type="range" min={0} max={1} step={0.05} value={strip.auxA} className="h-[10px] min-w-0 flex-1 green-fill"
                    style={{ ['--fill' as any]: `${strip.auxA * 100}%` }}
                    onChange={(e) => setMixerTrack(track.id, { auxA: +e.target.value })} aria-label={`${track.name} aux 1 send`} />
                  <span className="mono text-[10px] text-tmuted">{Math.round(strip.auxA * 100)}%</span>
                </Row>
                {/* A2 twin (R14): the editor showed only the A1 send while the
                    model + strip both carry auxB — parity with the strip rows */}
                <Row label="A2 send">
                  <input type="range" min={0} max={1} step={0.05} value={strip.auxB} className="h-[10px] min-w-0 flex-1 green-fill"
                    style={{ ['--fill' as any]: `${strip.auxB * 100}%` }}
                    onChange={(e) => setMixerTrack(track.id, { auxB: +e.target.value })} aria-label={`${track.name} aux 2 send`} />
                  <span className="mono text-[10px] text-tmuted">{Math.round(strip.auxB * 100)}%</span>
                </Row>
                {/* tap point: ONE shared pre/post field per track (spec 20
                    §4.2 auxPreFader) — real toggle via setMixerTrack; lived on
                    the strip before R19-B1, moved here with the sends */}
                <Row label="Tap">
                  <button
                    onClick={() => setMixerTrack(track.id, { auxPreFader: !strip.auxPreFader })}
                    aria-pressed={strip.auxPreFader}
                    aria-label="Aux send pre-fader"
                    data-tip={`Aux tap point — ${strip.auxPreFader ? 'pre' : 'post'} fader`}
                    className={`mono flex h-[14px] items-center justify-center rounded-[2px] border px-2 text-[9px] font-bold ${strip.auxPreFader ? 'border-accent bg-accent/20 text-accent' : 'border-strong bg-inset text-tmuted'}`}
                  >
                    {strip.auxPreFader ? 'pre' : 'post'}
                  </button>
                  <span className="text-[10px] text-tfaint">aux tap point</span>
                </Row>

                {/* duck-under (spec 20 §12.2 answer) */}
                {duck && (
                  <div className="mt-1 flex flex-col gap-1 rounded-[var(--radius)] border border-hairline bg-inset px-2 py-2" data-testid={`channel-ducking-${track.badge}`}>
                    <div className="flex items-center gap-1.5">
                      <Volume2 size={11} className="text-accent" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-tmuted">Duck under</span>
                    </div>
                    <Row label="Source">
                      <select aria-label="Ducking source" className="field min-w-0 flex-1 cursor-pointer px-1 py-0 text-[10px]"
                        value={duck.source ?? ''} onChange={(e) => setDucking(track.id, { source: e.target.value || null })}>
                        <option value="">—</option>
                        {audioTracks.filter((t) => t.id !== track.id).map((t) => <option key={t.id} value={t.id}>{t.badge} {t.name}</option>)}
                      </select>
                    </Row>
                    <Row label="Amount">
                      <input type="range" min={0} max={1} step={0.05} value={duck.amount} className="h-[10px] min-w-0 flex-1"
                        onChange={(e) => setDucking(track.id, { amount: +e.target.value })} aria-label="Ducking amount" />
                      <span className="mono text-[10px] text-tmuted">{Math.round(duck.amount * 100)}%</span>
                    </Row>
                    <div className="flex items-center gap-3 text-[10px] text-tmuted">
                      <span className="mono">attack {duck.attack} ms</span>
                      <span className="mono">release {duck.release} ms</span>
                    </div>
                  </div>
                )}

                {/* aux returns read-out */}
                <div className="mt-1 border-t border-hairline pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">Aux returns</span>
                  <Row label="A1">
                    <span className="mono text-[10px] text-tmuted">{mixer.buses.a1.name}</span>
                    <input type="range" min={-60} max={6} step={1} value={mixer.buses.a1.returnGain} className="h-[10px] min-w-0 flex-1"
                      onChange={(e) => setAuxBus('a1', { returnGain: +e.target.value })} aria-label="Aux 1 return gain" />
                    <span className="mono text-[10px] text-tmuted">{dbLabel(mixer.buses.a1.returnGain)}</span>
                  </Row>
                </div>

                {/* automation non-goal placeholder (design doc §8) */}
                <div className="mt-1 flex items-center gap-2 rounded-[var(--radius)] border border-dashed border-soft px-2 py-1.5" data-testid="channel-automation-placeholder">
                  <span className="text-[10px] text-tfaint">Automation — M2 (curve shape TBD, spec 20 §12.1)</span>
                  <Trash2 size={10} className="ml-auto text-tfaint" aria-hidden="true" />
                </div>
              </div>

              {/* the TERMINAL fader block (fixes th_mto37ze9): fills ALL
                  remaining vertical space, flush to the panel bottom — same
                  law as the strips (shared 24px headroom, [scale | fader |
                  meter] columns on one height var — R20-W1 D1 column order —
                  meter fixed 14px, D2 gridlines) */}
              <div data-testid="channel-editor-fader" className="flex min-h-[140px] shrink-0 self-stretch flex-col" style={{ width: 76 }}>
                <HeadroomReadout db={strip.fader} peakDb={peak} testId="channel-editor-readout" />
                <div
                  className="relative flex min-h-0 flex-1 items-stretch justify-center gap-1"
                  style={{ '--fader-col-h': '100%' } as React.CSSProperties}
                >
                  <FaderGridlines />
                  <div data-col="fader" className="relative flex min-h-0" style={{ height: 'var(--fader-col-h)' }}>
                    <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} fillHeight scale headroom={false} ariaLabel={`${track.name} fader`} />
                  </div>
                  <div data-col="meter" className="relative flex min-h-0" style={{ height: 'var(--fader-col-h)' }}>
                    <StripMeter trackId={track.id} db={strip.fader} fillHeight label={track.name} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-2 text-center text-[11px] text-tfaint">No audio tracks in this scene</p>
        )}
      </div>
    </div>
  );
}

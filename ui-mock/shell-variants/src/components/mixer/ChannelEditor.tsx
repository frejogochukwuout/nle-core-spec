/* ChannelEditor — the Audio-focus inspector swap (design doc §3.2): two
   sections that literally display the S/G seam. CLIP section = the selected
   element's audio fields (the SAME fields as the inspector Audio tab — 17
   §6.1 parity, one command set). TRACK section = the focused track's G strip
   in detail: fader/pan/inserts/sends/output bus + the duck-under row.
   Mock-level: G values live in the mockMixer sidecar, element fields in the
   doc slice. */

import { Volume2, Music2, Waves, AudioLines, Trash2 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { mediaById, type ElementJSON } from '../../lib/mockData';
import { ROLE_LABEL, dbLabel, type Role } from '../../state/mockMixer';
import { Fader, PanKnob } from './MixerPrimitives';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="w-[52px] shrink-0 text-[11px] text-tmuted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function NumField({ value, min, max, step = 0.1, unit, onCommit, ariaLabel }: {
  value: number; min: number; max: number; step?: number; unit?: string; onCommit: (v: number) => void; ariaLabel: string;
}) {
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
  const strip = track ? mixer.tracks[track.id] : undefined;
  const role = track ? (mixer.roles[track.id] as Role | undefined) : undefined;
  const duck = track ? mixer.ducking[track.id] : undefined;

  return (
    <div data-testid="shell-channel-editor" className="scroll-y flex h-full w-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-2">
        <AudioLines size={12} className="text-accent" />
        <span className="text-[11px] font-semibold text-tprimary">Channel editor</span>
        <span className="ml-auto text-[10px] text-tfaint">S + G layers</span>
      </div>

      {/* ---------- CLIP section (S-layer element fields) ---------- */}
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
            <Row label="Gain dB">
              <NumField value={((el.volume ?? 1) * 20 - 20)} min={-48} max={12} step={0.5} ariaLabel="Clip gain"
                onCommit={(dbv) => setElementField(el.id, { volume: Math.max(0.001, (dbv + 20) / 20) })} />
              <input type="range" min={-48} max={12} step={0.5} defaultValue={((el.volume ?? 1) * 20 - 20)}
                key={`${el.id}-${el.volume}`}
                className="h-[10px] min-w-0 flex-1"
                onPointerUp={(e) => setElementField(el.id, { volume: Math.max(0.001, (+ (e.target as HTMLInputElement).value + 20) / 20) })}
                onKeyUp={(e) => setElementField(el.id, { volume: Math.max(0.001, (+ (e.target as HTMLInputElement).value + 20) / 20) })}
                aria-label="Clip gain slider (commit on release)" />
            </Row>
            <Row label="Fade in">
              <NumField value={el.audioFadeIn ?? 0} min={0} max={10} step={0.1} unit="s" ariaLabel="Audio fade in"
                onCommit={(v) => setElementField(el.id, { audioFadeIn: v })} />
            </Row>
            <Row label="Fade out">
              <NumField value={el.audioFadeOut ?? 0} min={0} max={10} step={0.1} unit="s" ariaLabel="Audio fade out"
                onCommit={(v) => setElementField(el.id, { audioFadeOut: v })} />
            </Row>
            <p className="mt-1 text-[10px] leading-[1.4] text-tfaint">
              Same fields and commands as the inspector Audio tab (spec 17 §6.1 parity). Strip fader ≠ clip gain — different layers.
            </p>
          </div>
        ) : (
          <p className="py-2 text-center text-[11px] text-tfaint" data-testid="shell-channel-editor-state-noclip">
            Select an audio clip to edit its level
          </p>
        )}
      </div>

      {/* ---------- TRACK section (G-layer strip params) ---------- */}
      <div className="px-2.5 py-2">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">Track</span>
          <span className="text-[10px] text-tfaint">· signal layer</span>
          {role && <span className="ml-auto rounded-[2px] border border-hairline bg-inset px-1 text-[10px] font-semibold uppercase text-tmuted">{ROLE_LABEL[role]}</span>}
        </div>
        {track && strip ? (
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className="mono flex h-[18px] w-[28px] items-center justify-center rounded-[2px] border border-[var(--type-audio)] text-[11px] font-semibold text-[var(--type-audio)]">{track.badge}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{track.name}</span>
            </div>
            <div className="flex gap-3">
              <Fader db={strip.fader} onChange={(db) => setMixerTrack(track.id, { fader: db })} height={84} ariaLabel={`${track.name} fader`} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Row label="Fader"><span className="mono text-[11px] text-tprimary">{dbLabel(strip.fader)}</span></Row>
                <div className="flex items-center gap-2 py-1">
                  <span className="w-[52px] shrink-0 text-[11px] text-tmuted">Pan</span>
                  <PanKnob pan={strip.pan} onChange={(pan) => setMixerTrack(track.id, { pan })} ariaLabel={`${track.name} pan`} />
                </div>
                {([1, 2] as const).map((slot) => (
                  <Row key={slot} label={`Ins ${slot}`}>
                    <select aria-label={`Insert slot ${slot}`} className="field min-w-0 flex-1 cursor-pointer px-1 py-0 text-[10px]"
                      value={strip.inserts[slot - 1] ?? ''} onChange={(e) => setMixerTrack(track.id, { inserts: slot === 1 ? [e.target.value || null, strip.inserts[1]] : [strip.inserts[0], e.target.value || null] })}>
                      <option value="">—</option>
                      <option value="EQ">EQ</option><option value="Comp">Comp</option><option value="Gate">Gate</option><option value="De-esser">De-esser</option>
                    </select>
                  </Row>
                ))}
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
              </div>
            </div>

            {/* duck-under (spec 20 §12.2 answer) */}
            {duck && (
              <div className="mt-2 flex flex-col gap-1 rounded-[var(--radius)] border border-hairline bg-inset px-2 py-2" data-testid={`channel-ducking-${track.badge}`}>
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
            <div className="mt-2 border-t border-hairline pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">Aux returns</span>
              <Row label="A1">
                <span className="mono text-[10px] text-tmuted">{mixer.buses.a1.name}</span>
                <input type="range" min={-60} max={6} step={1} value={mixer.buses.a1.returnGain} className="h-[10px] min-w-0 flex-1"
                  onChange={(e) => setAuxBus('a1', { returnGain: +e.target.value })} aria-label="Aux 1 return gain" />
                <span className="mono text-[10px] text-tmuted">{dbLabel(mixer.buses.a1.returnGain)}</span>
              </Row>
            </div>

            {/* automation non-goal placeholder (design doc §8) */}
            <div className="mt-2 flex items-center gap-2 rounded-[var(--radius)] border border-dashed border-soft px-2 py-1.5" data-testid="channel-automation-placeholder">
              <span className="text-[10px] text-tfaint">Automation — M2 (curve shape TBD, spec 20 §12.1)</span>
              <Trash2 size={10} className="ml-auto text-tfaint" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <p className="py-2 text-center text-[11px] text-tfaint">No audio tracks in this scene</p>
        )}
      </div>
    </div>
  );
}

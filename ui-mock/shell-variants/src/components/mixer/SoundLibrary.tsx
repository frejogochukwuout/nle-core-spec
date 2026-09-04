/* SoundLibrary — the Audio-focus media-pool view (design doc §3.2): audio
   media + audio-bearing video, grouped by role (Dialogue/BGM/SFX/Music),
   role chips, Import-sound CTA, same search/sort as the pool. Reuses the
   pool's Thumb/waveform grammar. Roles are client-side tags keyed by
   mediaId (spec 09 has no role field — seal decision pending). */

import { useMemo, useState } from 'react';
import { Search, Upload, Waves, Music2, X } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project, type MediaRecord } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
import { getWaveform } from '../../lib/waveform';
import { ROLES, ROLE_LABEL, type Role } from '../../state/mockMixer';

const MEDIA_ROLES: Record<string, Role> = {
  'm-06': 'bgm',      // ocean_ambience.wav
  'm-07': 'dialogue', // interview_marina.wav
  'm-02': 'dialogue', // interview_marina.mp4 (audio-bearing video)
  'm-01': 'music',    // beach_wide ambience music bed
};

const audioBearing = (m: MediaRecord) => m.type === 'audio' || (m.type === 'video' && !m.offline);

function AudioThumb({ m, h = 30 }: { m: MediaRecord; h?: number }) {
  const bars = getWaveform(m.id, 64, { amplitude: 0.9 });
  return (
    <div className="flex w-full items-center justify-center overflow-hidden bg-inset" style={{ height: h + 10 }}>
      <svg width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
        {bars.map((b, i) => (
          <rect key={i} x={`${i * (100 / bars.length)}%`} y={h / 2 - (b.max * h) / 2}
            width={`${100 / bars.length - 0.7}%`} height={Math.max(1, (b.max + b.min) * h * 0.5)}
            fill="var(--waveform)" opacity={0.85} rx={0.5} />
        ))}
      </svg>
    </div>
  );
}

export function SoundLibrary() {
  const [q, setQ] = useState('');
  const setPlayhead = useUi((s) => s.setPlayhead);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const mediaSelection = useUi((s) => s.mediaSelection);
  const setMediaSelection = useUi((s) => s.setMediaSelection);
  const pushToast = useUi((s) => s.pushToast);

  const items = useMemo(
    () => project.media.filter(audioBearing).filter((m) => m.name.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  const grouped = useMemo(() => {
    const g: Record<Role, MediaRecord[]> = { dialogue: [], bgm: [], sfx: [], music: [] };
    for (const m of items) {
      const role = MEDIA_ROLES[m.id] ?? 'sfx';
      g[role].push(m);
    }
    return g;
  }, [items]);

  const scene = scenes.find((s) => s.id === activeSceneId);
  const reveal = (m: MediaRecord) => {
    const el = scene?.tracks.flatMap((t) => t.elements).find((e) => e.mediaId === m.id);
    if (el) setPlayhead(el.startTime + 0.1);
  };

  return (
    <div data-testid="shell-soundlibrary" className="flex h-full w-full min-h-0 flex-col bg-shell">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-hairline px-2 py-1.5">
        <Waves size={12} className="text-[var(--type-audio)]" />
        <span className="text-[11px] font-semibold text-tprimary">Sound Library</span>
        <span className="mono text-[10px] text-tfaint">{items.length}</span>
        <div className="grow" />
        <button
          className="toolbtn !py-1"
          onClick={() => pushToast({ kind: 'info', title: 'Import sound', detail: 'File picker is mock — drop files on the library' })}
          aria-label="Import sound"
          data-tip="Import sound (⌘I)"
        >
          <Upload size={12} strokeWidth={1.6} />
          <span className="text-[11px]">Import sound…</span>
        </button>
      </div>

      {/* search */}
      <div className="flex items-center gap-1.5 border-b border-hairline px-2 py-1.5">
        <Search size={12} className="shrink-0 text-tfaint" />
        <input
          className="field min-w-0 flex-1 text-[11px]"
          placeholder="Search sounds…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search sounds"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search" className="icon-btn !h-[18px] !w-[18px]">
            <X size={11} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {/* grouped list */}
      <div className="scroll-y min-h-0 flex-1 p-1.5">
        {items.length === 0 && (
          <p className="py-6 text-center text-[11px] text-tfaint" data-testid="shell-soundlibrary-state-noresult">
            No sounds match “{q}”
          </p>
        )}
        {ROLES.map((role) => (
          grouped[role].length > 0 && (
            <div key={role} className="mb-2">
              <div className="mb-1 flex items-center gap-1.5 px-1">
                {role === 'music' || role === 'bgm' ? <Music2 size={11} className="text-tfaint" /> : <Waves size={11} className="text-tfaint" />}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-tfaint">{ROLE_LABEL[role]}</span>
                <span className="mono text-[10px] text-tfaint">{grouped[role].length}</span>
              </div>
              {grouped[role].map((m) => (
                <button
                  key={m.id}
                  className={`mb-1 flex w-full items-center gap-2 rounded-[var(--radius)] border px-1.5 py-1 text-left ${
                    mediaSelection.includes(m.id) ? 'border-accent bg-[color-mix(in_srgb,var(--accent-selection)_10%,transparent)]' : 'border-transparent hover:border-soft hover:bg-[var(--hover-overlay)]'
                  }`}
                  onClick={() => setMediaSelection([m.id])}
                  onDoubleClick={() => reveal(m)}
                  aria-label={`${m.name}, ${m.duration !== null ? tc(m.duration) : 'still'}`}
                  data-testid="shell-soundlibrary-item"
                >
                  <div className="h-[24px] w-[64px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-hairline">
                    <AudioThumb m={m} h={18} />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{m.name}</span>
                  {m.type === 'video' && <span className="mono shrink-0 rounded border border-soft px-1 text-[10px] font-bold text-tmuted">V+A</span>}
                  <span className="mono shrink-0 text-[10px] text-tmuted">{m.duration !== null ? tc(m.duration) : '—'}</span>
                </button>
              ))}
            </div>
          )
        ))}
      </div>

      {/* footer */}
      <div aria-live="polite" className="flex items-center gap-2 border-t border-hairline px-2.5 py-1 text-[11px] text-tmuted">
        <span>{items.length} sounds · {mediaSelection.length} selected</span>
        <span className="grow" />
        <span className="mono text-[10px] text-tfaint">audio-bearing video included</span>
      </div>
    </div>
  );
}

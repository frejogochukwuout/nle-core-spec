/* SoundLibrary — the Audio-focus media-pool view (design doc §3.2): audio
   media + audio-bearing video, grouped by role (Dialogue/BGM/SFX/Music),
   role chips, Import-sound CTA, same search/sort grammar as the pool
   (search filter + name/type/duration sort × asc/desc — R14: the sort
   control was missing while the header claimed parity). Reuses the pool's
   Thumb/waveform grammar. */

import { useMemo, useState } from 'react';
import { Search, Upload, Waves, Music2, X, ArrowUpNarrowWide, ArrowDownWideNarrow } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project, type MediaRecord } from '../../lib/mockData';
import { tc } from '../../lib/timecode';
import { getWaveform } from '../../lib/waveform';
import { ROLES, ROLE_LABEL, type Role } from '../../state/mockMixer';

/* mediaId-keyed role tags — TWO-REGISTRY DEVIATION (R14, registered as a
   spec-revision candidate): DESIGN-audio-mode §7 specifies ONE roles map
   keyed by Record<trackId|mediaId>, but the store's mixer.roles is
   trackId-keyed today and useUiStore/mockMixer are outside this task's
   edit scope. The registry stays module-local until the store unifies;
   spec 09 has no role field either way (seal decision pending). */
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
  /* LOCAL sort state (R14): mirrors the pool's sort grammar (name/type/
     duration × asc/desc) without aliasing the pool's store-persisted sort —
     the two views sort independently */
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'duration'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const setPlayhead = useUi((s) => s.setPlayhead);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const mediaSelection = useUi((s) => s.mediaSelection);
  const setMediaSelection = useUi((s) => s.setMediaSelection);
  const pushToast = useUi((s) => s.pushToast);

  /* pool's comparator grammar (MediaPool.cmpBy, minus the unused date mode) */
  const cmp = (a: MediaRecord, b: MediaRecord) => {
    const r = sortBy === 'duration'
      ? (a.duration ?? -1) - (b.duration ?? -1) // stills sink in asc
      : sortBy === 'type'
        ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name);
    return sortDir === 'asc' ? r : -r;
  };

  const items = useMemo(
    () => project.media
      .filter(audioBearing)
      .filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))
      .sort(cmp), // sorted BEFORE grouping → each role group inherits the order
    [q, sortBy, sortDir],
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
        {/* sort grammar twin of the pool header (R14): mode select + dir flip */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort sounds"
          className="field w-[58px] shrink-0 cursor-pointer"
          title="Sort sounds"
        >
          <option value="name">Name</option>
          <option value="duration">Dur.</option>
          <option value="type">Type</option>
        </select>
        <button
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
          data-tip={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
          className="icon-btn !h-[18px] !w-[18px] shrink-0"
        >
          {sortDir === 'asc' ? <ArrowUpNarrowWide size={13} strokeWidth={1.6} /> : <ArrowDownWideNarrow size={13} strokeWidth={1.6} />}
        </button>
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

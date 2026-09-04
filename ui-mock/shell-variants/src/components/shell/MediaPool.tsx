/* MediaPool — spec 18 §4.2: import affordance, clip grid/list, search (200ms
   debounce class), sort modes, count footer (aria-live), missing-asset badge.
   Bins/smart bins rejected (§8.14) — flat list, spec 09 MediaRecord fields only. */

import { useMemo, useState } from 'react';
import { Search, LayoutGrid, List, Upload, X, TriangleAlert, Clock3 } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project, type MediaRecord } from '../../lib/mockData';
import { tc, totalDuration } from '../../lib/timecode';
import { getWaveform } from '../../lib/waveform';

const typeBadge = (m: MediaRecord) =>
  m.type === 'video' ? { t: 'V', cls: 'border-[var(--type-video)] text-[var(--type-video)]' }
  : m.type === 'audio' ? { t: 'A', cls: 'border-[var(--type-audio)] text-[var(--type-audio)]' }
  : { t: 'I', cls: 'border-[var(--type-overlay)] text-[var(--type-overlay)]' };

function Thumb({ m, small = false }: { m: MediaRecord; small?: boolean }) {
  if (m.type === 'audio') {
    // deterministic mini-waveform as the audio "thumbnail"
    const bars = getWaveform(m.id, small ? 28 : 48, { amplitude: 0.9 });
    const h = small ? 14 : 34;
    return (
      <div className="flex w-full items-center justify-center overflow-hidden bg-inset" style={{ height: small ? 22 : 46 }}>
        <svg width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
          {bars.map((b, i) => (
            <rect
              key={i}
              x={i * (100 / bars.length) + '%'}
              y={h / 2 - (b.max * h) / 2}
              width={100 / bars.length - 0.7 + '%'}
              height={Math.max(1, (b.max + b.min) * h * 0.5)}
              fill="var(--waveform)"
              opacity={0.85}
              rx={0.5}
            />
          ))}
        </svg>
      </div>
    );
  }
  return (
    <img
      src={m.thumbnail}
      alt=""
      aria-hidden="true"
      className={`h-full w-full ${m.offline ? 'opacity-40 grayscale' : ''}`}
      style={{ objectFit: 'cover' }}
      loading="lazy"
    />
  );
}

function MediaCard({ m, selected, onSelect }: { m: MediaRecord; selected: boolean; onSelect: () => void }) {
  const badge = typeBadge(m);
  return (
    <button
      role="option"
      aria-selected={selected}
      aria-label={`${m.name}, ${m.duration !== null ? tc(m.duration) : 'still'}`}
      onClick={onSelect}
      onDoubleClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-[var(--radius)] border bg-inset text-left transition-colors ${
        selected ? 'border-accent shadow-[inset_0_0_0_1px_var(--accent-selection)]' : 'border-soft hover:border-strong'
      }`}
      data-testid="shell-mediapool-card"
    >
      <div className="relative aspect-video w-full overflow-hidden border-b border-hairline">
        <Thumb m={m} />
        <span className="mono absolute bottom-1 right-1 rounded-sm bg-black/70 px-1 py-0.5 text-[11px] text-white">
          {m.duration !== null ? tc(m.duration) : 'STILL'}
        </span>
        {m.offline && (
          <span className="absolute left-1 top-1 flex items-center gap-1 rounded-sm bg-[var(--danger)]/90 px-1.5 py-0.5 text-[11px] font-bold text-white">
            <TriangleAlert size={11} /> Media offline
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="truncate text-[11px] text-tprimary">{m.name}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-tmuted">
          <span className={`mono rounded border px-1 font-bold ${badge.cls}`}>{badge.t}</span>
          {m.width ? <span className="mono">{m.width}×{m.height}</span> : <span>audio</span>}
          {m.fps && m.fps !== project.settings.fps && <span className="mono rounded-sm border border-soft px-1 text-[11px] text-tmuted">{m.fps}p</span>}
        </span>
      </div>
    </button>
  );
}

function MediaRow({ m, selected, onSelect }: { m: MediaRecord; selected: boolean; onSelect: () => void }) {
  const badge = typeBadge(m);
  return (
    <button
      role="option"
      aria-selected={selected}
      aria-label={m.name}
      onClick={onSelect}
      className={`flex items-center gap-2.5 rounded-[var(--radius)] border px-2 py-1.5 text-left transition-colors ${
        selected ? 'border-accent bg-[color-mix(in_srgb,var(--accent-selection)_10%,transparent)]' : 'border-transparent hover:border-soft hover:bg-[var(--hover-overlay)]'
      }`}
    >
      <div className="h-[26px] w-[46px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-hairline">
        <Thumb m={m} small />
      </div>
      <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{m.name}</span>
      {m.offline && <TriangleAlert size={11} className="shrink-0 text-[var(--danger)]" aria-label="Media offline" />}
      <span className={`mono shrink-0 rounded border px-1 text-[11px] font-bold ${badge.cls}`}>{badge.t}</span>
      <span className="mono w-[74px] shrink-0 text-right text-[11px] text-tmuted">
        {m.duration !== null ? tc(m.duration) : '—'}
      </span>
    </button>
  );
}

export function MediaPool() {
  const [searchInput, setSearchInput] = useState('');
  const mediaView = useUi((s) => s.mediaView);
  const sortBy = useUi((s) => s.sortBy);
  const setMediaView = useUi((s) => s.setMediaView);
  const setSortBy = useUi((s) => s.setSortBy);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const mediaSelection = useUi((s) => s.mediaSelection);
  const setMediaSelection = useUi((s) => s.setMediaSelection);
  const activeScene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);

  // 200ms debounce class (spec 18 §4.2) — mock-level: commit on idle
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchInput(v);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => useUi.getState().setSearch(v.trim().toLowerCase()), 200));
  };

  const search = useUi((s) => s.search);

  const items = useMemo(() => {
    const filtered = search ? project.media.filter((m) => m.name.toLowerCase().includes(search)) : [...project.media];
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'duration': return (b.duration ?? 0) - (a.duration ?? 0);
        case 'date': return b.importedAt.localeCompare(a.importedAt);
        case 'type': return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });
    return filtered;
  }, [search, sortBy]);

  const totalSec = items.reduce((acc, m) => acc + (m.duration ?? 0), 0);

  const revealFirstUse = (m: MediaRecord) => {
    const el = activeScene.tracks.flatMap((t) => t.elements).find((e) => e.mediaId === m.id);
    if (el) setPlayhead(el.startTime + 0.1);
  };

  const select = (m: MediaRecord) => {
    setMediaSelection(m.id);
    revealFirstUse(m);
  };

  return (
    <div
      data-testid="shell-mediapool"
      className="flex h-full min-h-0 flex-col bg-shell"
    >
      {/* pool header — search + sort + view in one row */}
      <div className="flex items-center gap-1.5 border-b border-hairline px-2 py-1.5">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search size={11} className="absolute left-1.5 text-tfaint" />
          <input
            value={searchInput}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search media"
            aria-label="Search media"
            className="field w-full pl-6 pr-6"
          />
          {searchInput && (
            <button onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-1 text-tfaint hover:text-tprimary">
              <X size={11} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort media"
          className="field w-[74px] shrink-0 cursor-pointer"
          title="Sort media"
        >
          <option value="name">Name</option>
          <option value="duration">Dur.</option>
          <option value="date">Date</option>
          <option value="type">Type</option>
        </select>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            className={`icon-btn !h-[22px] !w-[22px] ${mediaView === 'grid' ? 'toggled' : ''}`}
            onClick={() => setMediaView('grid')}
            data-tip="Grid view"
            aria-label="Grid view"
            aria-pressed={mediaView === 'grid'}
          >
            <LayoutGrid size={12} />
          </button>
          <button
            className={`icon-btn !h-[22px] !w-[22px] ${mediaView === 'list' ? 'toggled' : ''}`}
            onClick={() => setMediaView('list')}
            data-tip="List view"
            aria-label="List view"
            aria-pressed={mediaView === 'list'}
          >
            <List size={12} />
          </button>
        </div>
      </div>

      {/* import CTA */}
      <div className="border-b border-hairline p-2">
        <button className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-strong px-2 py-2 text-[11px] text-tmuted transition-colors hover:border-accent hover:text-tprimary">
          <Upload size={12} />
          Import media
          <span className="mono rounded border border-soft px-1 text-[11px] text-tfaint">⌘I</span>
        </button>
      </div>

      {/* content */}
      <div className="scroll-y min-h-0 flex-1 p-2" role="listbox" aria-label="Media pool">
        {items.length === 0 ? (
          <div data-testid="shell-mediapool-state-noresult" className="flex flex-col items-center gap-2 py-8 text-center">
            <Search size={20} className="text-tfaint" />
            <p className="text-[12px] text-tmuted">No clips match "{search}"</p>
            <button onClick={() => onSearch('')} className="text-[11px] text-accent underline-offset-2 hover:underline">
              Clear search
            </button>
          </div>
        ) : mediaView === 'grid' ? (
          <div className="grid grid-cols-2 gap-2">
            {items.map((m) => <MediaCard key={m.id} m={m} selected={mediaSelection === m.id} onSelect={() => select(m)} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((m) => <MediaRow key={m.id} m={m} selected={mediaSelection === m.id} onSelect={() => select(m)} />)}
          </div>
        )}
      </div>

      {/* footer — live counts (spec 18 §4.2) */}
      <div
        aria-live="polite"
        className="flex items-center gap-2 border-t border-hairline px-2.5 py-1 text-[11px] text-tmuted"
      >
        <Clock3 size={11} />
        <span>{items.length} clips · {totalDuration(totalSec)} total</span>
        <span className="grow" />
        <span className="mono">{project.settings.fps} fps</span>
      </div>
    </div>
  );
}

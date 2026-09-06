/* MediaPool — spec 18 §4.2 (v1.1) full contract:
   - import affordances: header "Import media" button (mock file picker →
     toast; the real shell runs the spec 15 §5.4 probe → persistBlob →
     thumbnail sequence), whole-body HTML5 drag-drop target with a
     dashed-accent overlay while files are over it, ⌘I hint (the global
     shortcut already lives in useShortcuts);
   - clip grid/list: card anatomy = thumb, name, TC duration, TYPE ICON
     badge (R19 th_mto2qzoh/th_mto2sako: Film/AudioLines/Image glyphs, the
     standard NLE affordance, replaced the V/A/I letters), resolution, fps
     badge when ≠ project fps; offline = red left stripe + "Media offline"
     warning badge (§4.2 missing-asset state);
   - hover-to-autoplay (R19 th_mto2s2nc, gap C42): dwelling ≥400 ms on a
     card runs a subtle scrub preview — ken-burns pan on the poster, a
     PREVIEW chip + a progress hairline. Ambient and toast-free.
   - sort: 4 modes × asc/desc direction toggle, persisted with the view
     pref under ONE localStorage key ("nle-mock-pool-prefs"); hydrated on
     mount only while the store still holds defaults (defensive);
   - search: name filter (case-insensitive), 200 ms debounce, clear ×;
     empty result is the distinct no-result state row;
   - selection: click = single, ⌘/Ctrl-click = additive toggle, Shift-click
     = range over the flat filtered order (anchor = last single click);
     listbox semantics with aria-activedescendant + arrow-key navigation
     (Up/Down move active, Enter = reveal, Space = toggle) — handled
     locally with stopPropagation so the global spec-16 layer and the
     focused listbox never fight;
   - drag-to-lane: cards are HTML5 drag sources (custom data type); the
     timeline lanes (Timeline.tsx) are drop targets driving mediaDrag:
     pointer ghost (thumbnail + name, 50% opacity), copy / not-allowed
     cursor via dropEffect, hovered-lane highlight; drop commits an
     honest-mock toast — the store has no insertElement action yet;
   - context menu (§4.9, consumed via ContextMenu.tsx): Reveal in timeline
     / Copy / Move to… / Remove from pool;
   - state rows: empty (import CTA + sample project §4.10), loading
     skeleton (first mount only, simulated OPFS read), no-result;
     footer aria-live counts. Bins/smart bins rejected (§8.14) — flat pool. */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, LayoutGrid, List, Download, X, TriangleAlert, Clock3, Clapperboard,
  ArrowUpNarrowWide, ArrowDownWideNarrow, Film, AudioLines, Image,
} from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { project, type MediaRecord, type MediaType, type TrackKind } from '../../lib/mockData';
import { tc, totalDuration, clamp, snapToFrame } from '../../lib/timecode';
import { getWaveform } from '../../lib/waveform';
import { ContextMenu, useContextMenu, isMenuKey, type MenuItem } from './ContextMenu';

/* ---- drag contract shared with the timeline lanes (Timeline.tsx) ---- */
export const POOL_DRAG_TYPE = 'application/x-nle-media';

/** placement compatibility (spec 06 §5.9 subset, mock): video → main lane,
 *  image → overlay (text) lane, audio → audio lane; anything else
 *  not-allowed. */
export function isDroppable(kind: TrackKind, type: MediaType): boolean {
  return (
    (kind === 'main' && type === 'video') ||
    (kind === 'overlay' && type === 'image') ||
    (kind === 'audio' && type === 'audio')
  );
}

type SortBy = 'name' | 'duration' | 'date' | 'type';
type SortDir = 'asc' | 'desc';

const PREFS_KEY = 'nle-mock-pool-prefs'; // one key: mediaView + sortBy + sortDir (§4.2)
const OPFS_BOOT_MS = 900;                // first-mount skeleton — simulated OPFS read
const SEARCH_DEBOUNCE_MS = 200;          // §4.2 search debounce
const MENU_NAME = 'mediapool';           // testids: shell-menu-mediapool-<item>

/* th_mto2qzoh + th_mto2sako: the V/A/I LETTER badges became TYPE ICONS —
   Film = video, AudioLines = audio, Image = still. Standard NLE affordance
   (reviewer request); same boxed badge chrome + the same --type-* tokens,
   and the label contract moves to role=img + aria-label so screen readers
   still announce the type per card/row. */
const TYPE_ICONS: Record<MediaType, { Icon: typeof Film; label: string; cls: string }> = {
  video: { Icon: Film, label: 'Video', cls: 'border-[var(--type-video)] text-[var(--type-video)]' },
  audio: { Icon: AudioLines, label: 'Audio', cls: 'border-[var(--type-audio)] text-[var(--type-audio)]' },
  image: { Icon: Image, label: 'Image', cls: 'border-[var(--type-overlay)] text-[var(--type-overlay)]' },
};

function TypeIconBadge({ m }: { m: MediaRecord }) {
  const { Icon, label, cls } = TYPE_ICONS[m.type];
  return (
    <span role="img" aria-label={label} title={label} className={`mono flex h-[17px] w-[18px] shrink-0 items-center justify-center rounded border ${cls}`}>
      <Icon size={11} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

function cmpBy(sortBy: SortBy, a: MediaRecord, b: MediaRecord): number {
  switch (sortBy) {
    case 'duration': return (a.duration ?? -1) - (b.duration ?? -1); // stills sink in asc
    case 'date': return a.importedAt.localeCompare(b.importedAt);
    case 'type': return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
    case 'name': return a.name.localeCompare(b.name);
  }
}

/* ---- hover-to-autoplay scrub preview (th_mto2s2nc, gap C42) ----
   Dwelling ≥ HOVER_DWELL_MS on a card starts an AMBIENT preview: a slow
   ken-burns pan across the poster + a PREVIEW chip + a progress hairline
   that sweeps the same 6 s window. Toast-free on purpose — the state is
   ambient chrome, not an event the user must acknowledge.
   HONEST MOCK (gap C42): a real implementation loads poster FRAMES from a
   thumb-specific asset strip and scrubs them — NEVER the full-res source;
   the mock has no poster-frame assets, so the pan/hairline stand in for the
   scrub and say so in code here. */
const HOVER_DWELL_MS = 400;
const PREVIEW_SWEEP_S = 6; // pan + hairline window — one gentle sweep, no loop

function Thumb({ m, small = false, preview = false }: { m: MediaRecord; small?: boolean; preview?: boolean }) {
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
      style={{
        objectFit: 'cover',
        /* ken-burns sweep while previewing: object-position + a slight scale
           drift over the same PREVIEW_SWEEP_S window the hairline runs */
        objectPosition: preview ? '85% 50%' : '50% 50%',
        transform: preview ? 'scale(1.06)' : 'scale(1)',
        transition: preview ? `object-position ${PREVIEW_SWEEP_S}s linear, transform ${PREVIEW_SWEEP_S}s ease-out` : 'none',
      }}
      loading="lazy"
    />
  );
}

interface ItemProps {
  m: MediaRecord;
  selected: boolean;
  active: boolean; // aria-activedescendant target (arrow-key focus proxy)
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/* §4.2 offline treatment: red left stripe (absolute, cascade-proof) +
   "Media offline" badge on the thumb */
function MediaCard({ m, selected, active, onClick, onDoubleClick, onContextMenu, onDragStart, onDragEnd }: ItemProps) {
  /* hover-dwell preview state (th_mto2s2nc): the dwell timer starts on
     mouseenter and cancels on leave — a quick pass (<400 ms) never arms it */
  const [preview, setPreview] = useState(false);
  const dwellRef = useRef<number | null>(null);
  const startDwell = () => {
    if (dwellRef.current !== null) return;
    dwellRef.current = window.setTimeout(() => setPreview(true), HOVER_DWELL_MS);
  };
  const cancelDwell = () => {
    if (dwellRef.current !== null) {
      window.clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
    setPreview(false); // leave = reset (snap back, no reverse theater)
  };
  useEffect(() => () => {
    if (dwellRef.current !== null) window.clearTimeout(dwellRef.current);
  }, []);
  return (
    <div
      id={`pool-opt-${m.id}`}
      role="option"
      aria-selected={selected}
      aria-label={`${m.name}, ${m.duration !== null ? tc(m.duration) : 'still image'}, ${m.type}`}
      data-testid="shell-mediapool-card"
      draggable
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={startDwell}
      onMouseLeave={cancelDwell}
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius)] border bg-inset text-left transition-colors ${
        selected
          ? 'border-accent shadow-[inset_0_0_0_1px_var(--accent-selection)]'
          : active
            ? 'border-strong'
            : 'border-soft hover:border-strong'
      }`}
    >
      {m.offline && <span className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-[3px] bg-[var(--danger)]" aria-hidden="true" />}
      <div className="relative aspect-video w-full overflow-hidden border-b border-hairline">
        <Thumb m={m} preview={preview} />
        <span className="mono absolute bottom-1 right-1 rounded-sm bg-black/70 px-1 py-0.5 text-[11px] text-white">
          {m.duration !== null ? tc(m.duration) : 'STILL'}
        </span>
        {m.offline && (
          <span className="absolute left-1 top-1 flex items-center gap-1 rounded-sm bg-[var(--danger)]/90 px-1.5 py-0.5 text-[11px] font-bold text-white">
            <TriangleAlert size={11} strokeWidth={1.6} /> Media offline
          </span>
        )}
        {/* th_mto2s2nc ambient preview chrome: chip + progress hairline over
            the same PREVIEW_SWEEP_S window the poster pans — no toast, this
            is ambient state, not an event */}
        {preview && (
          <span
            data-testid="shell-mediapool-preview-chip"
            className="mono absolute right-1 top-1 rounded-sm bg-black/75 px-1 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white"
          >
            PREVIEW
          </span>
        )}
        {preview && (
          <div
            data-testid="shell-mediapool-preview-progress"
            className="absolute bottom-0 left-0 h-[2px]"
            style={{ width: '100%', background: 'var(--accent-selection)', transition: `width ${PREVIEW_SWEEP_S}s linear`, transitionProperty: 'width' }}
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="truncate text-[11px] text-tprimary">{m.name}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-tmuted">
          <TypeIconBadge m={m} />
          {m.width ? <span className="mono">{m.width}×{m.height}</span> : <span>audio</span>}
          {m.fps && m.fps !== project.settings.fps && <span className="mono rounded-sm border border-soft px-1 text-[11px] text-tmuted">{m.fps}p</span>}
        </span>
      </div>
    </div>
  );
}

function MediaRow({ m, selected, active, onClick, onDoubleClick, onContextMenu, onDragStart, onDragEnd }: ItemProps) {
  return (
    <div
      id={`pool-opt-${m.id}`}
      role="option"
      aria-selected={selected}
      aria-label={`${m.name}, ${m.duration !== null ? tc(m.duration) : 'still image'}, ${m.type}`}
      data-testid="shell-mediapool-card"
      draggable
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative flex items-center gap-2.5 rounded-[var(--radius)] border px-2 py-1.5 text-left transition-colors ${
        selected
          ? 'border-accent bg-[color-mix(in_srgb,var(--accent-selection)_10%,transparent)]'
          : active
            ? 'border-soft'
            : 'border-transparent hover:border-soft hover:bg-[var(--hover-overlay)]'
      }`}
    >
      {m.offline && <span className="pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] rounded-l-[var(--radius)] bg-[var(--danger)]" aria-hidden="true" />}
      <div className="h-[26px] w-[46px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-hairline">
        <Thumb m={m} small />
      </div>
      <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{m.name}</span>
      {m.offline && <TriangleAlert size={11} strokeWidth={1.6} className="shrink-0 text-[var(--danger)]" aria-label="Media offline" />}
      <TypeIconBadge m={m} />
      <span className="mono w-[74px] shrink-0 text-right text-[11px] text-tmuted">
        {m.duration !== null ? tc(m.duration) : '—'}
      </span>
    </div>
  );
}

export function MediaPool() {
  const mediaView = useUi((s) => s.mediaView);
  const sortBy = useUi((s) => s.sortBy);
  const sortDir = useUi((s) => s.sortDir);
  const search = useUi((s) => s.search);
  const mediaSelection = useUi((s) => s.mediaSelection);
  const mediaDrag = useUi((s) => s.mediaDrag);
  const activeScene = useUi((s) => s.scenes.find((x) => x.id === s.activeSceneId)!);
  const setMediaView = useUi((s) => s.setMediaView);
  const setSortBy = useUi((s) => s.setSortBy);
  const setSortDir = useUi((s) => s.setSortDir);
  const setPlayhead = useUi((s) => s.setPlayhead);
  const setMediaSelection = useUi((s) => s.setMediaSelection);
  const toggleMediaSelection = useUi((s) => s.toggleMediaSelection);
  const setMediaDrag = useUi((s) => s.setMediaDrag);
  const pushToast = useUi((s) => s.pushToast);
  const loadSampleProject = useUi((s) => s.loadSampleProject);
  const enterSourcePreview = useUi((s) => s.enterSourcePreview);
  const exitSourcePreview = useUi((s) => s.exitSourcePreview);

  const menu = useContextMenu(); // §4.9 media-pool menu
  const bodyRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [booting, setBooting] = useState(true);      // first-mount OPFS skeleton
  const [fileOver, setFileOver] = useState(false);   // external file drag over body
  const [removedIds, setRemovedIds] = useState<string[]>([]); // mock removals (component-local)
  const [anchorId, setAnchorId] = useState<string | null>(null); // shift-range anchor
  const [activeId, setActiveId] = useState<string | null>(() => useUi.getState().mediaSelection[0] ?? null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  /* first mount: 900ms skeleton (simulated OPFS read) + one-shot pref
     hydration — ONLY when the store still holds defaults, fully defensive
     against corrupt / unavailable localStorage */
  useEffect(() => {
    const t = window.setTimeout(() => setBooting(false), OPFS_BOOT_MS);
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, unknown>;
        const s = useUi.getState();
        const storeIsDefault = s.mediaView === 'grid' && s.sortBy === 'name' && s.sortDir === 'asc';
        if (storeIsDefault) {
          if (p.mediaView === 'grid' || p.mediaView === 'list') s.setMediaView(p.mediaView);
          if (p.sortBy === 'name' || p.sortBy === 'duration' || p.sortBy === 'date' || p.sortBy === 'type') s.setSortBy(p.sortBy);
          if (p.sortDir === 'asc' || p.sortDir === 'desc') s.setSortDir(p.sortDir);
        }
      }
    } catch { /* corrupt prefs / storage unavailable — keep store defaults */ }
    return () => window.clearTimeout(t);
  }, []);

  /* persist view + sort prefs under the one key (§4.2 sort-state persistence) */
  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ mediaView, sortBy, sortDir }));
    } catch { /* storage unavailable — prefs stay session-only */ }
  }, [mediaView, sortBy, sortDir]);

  /* ghost follows the pointer while a pool drag is live (HTML5 drag suppresses
     mousemove, so we ride the dragover stream in the capture phase); dragend
     anywhere cancels the drag state as a backstop to the card's own handler */
  const dragMediaId = mediaDrag?.mediaId ?? null;
  useEffect(() => {
    if (!dragMediaId) return;
    const onOver = (e: DragEvent) => setGhost({ x: e.clientX, y: e.clientY });
    const onEnd = () => useUi.getState().setMediaDrag(null);
    window.addEventListener('dragover', onOver, true);
    window.addEventListener('dragend', onEnd, true);
    return () => {
      window.removeEventListener('dragover', onOver, true);
      window.removeEventListener('dragend', onEnd, true);
    };
  }, [dragMediaId]);

  /* pending debounce timer must never outlive the panel */
  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  /* 200ms-debounced name filter (§4.2) — commit on idle */
  const onSearch = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      useUi.getState().setSearch(v.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
  };
  const clearSearch = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSearchInput('');
    useUi.getState().setSearch('');
  };

  /* flat filtered order — sort runs client-side, direction multiplies */
  const items = useMemo<MediaRecord[]>(() => {
    const pool = removedIds.length === 0 ? project.media : project.media.filter((m) => !removedIds.includes(m.id));
    const filtered = search ? pool.filter((m) => m.name.toLowerCase().includes(search)) : [...pool];
    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => dir * cmpBy(sortBy, a, b));
    return filtered;
  }, [search, sortBy, sortDir, removedIds]);

  /* keep the activedescendant target valid when the list re-filters */
  useEffect(() => {
    if (items.length === 0) return;
    if (!activeId || !items.some((m) => m.id === activeId)) setActiveId(items[0].id);
  }, [items, activeId]);

  const poolSize = project.media.length - removedIds.length; // removedIds ⊆ project.media

  const reveal = (m: MediaRecord) => {
    setMediaSelection([m.id]);
    setActiveId(m.id);
    setAnchorId(m.id);
    const el = activeScene.tracks.flatMap((t) => t.elements).find((e) => e.mediaId === m.id);
    // frame-grid discipline (R14 review: +0.1s raw offset landed off-grid —
    // 0.1s is 2.4 frames at 24fps); snap keeps the playhead on the lattice
    if (el) setPlayhead(snapToFrame(el.startTime + 1 / 24));
    else pushToast({ kind: 'info', title: `"${m.name}" is not on ${activeScene.name}`, detail: 'reveal jumps to the first clip using this asset in the active scene (mock)' });
  };

  /* th_mto3504c (spec 18 §4.3 v1.1 source preview + registered deviation
     C39): pool SELECTION drives the viewer's source-preview mode — exactly
     ONE selected card flips the monitor to that asset's poster; an empty OR
     multi selection returns the monitor to program mode (no single asset to
     show). Reveal/double-click deliberately does NOT enter the mode — one
     gesture, one meaning (the B4 ruling: reveal = jump the playhead). */
  const syncSourcePreview = (ids: string[]) => {
    if (ids.length === 1) enterSourcePreview(ids[0]);
    else exitSourcePreview();
  };

  const onItemClick = (e: React.MouseEvent, m: MediaRecord) => {
    const additive = e.metaKey || e.ctrlKey;
    setActiveId(m.id);
    if (e.shiftKey) {
      const anchor = anchorId ?? items[0]?.id ?? m.id;
      const a = items.findIndex((x) => x.id === anchor);
      const b = items.findIndex((x) => x.id === m.id);
      if (a === -1 || b === -1) {
        setMediaSelection([m.id]);
        setAnchorId(m.id);
        syncSourcePreview([m.id]);
        return;
      }
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const rangeIds = items.slice(lo, hi + 1).map((x) => x.id);
      setMediaSelection(rangeIds);
      syncSourcePreview(rangeIds); // multi → back to program
      return;
    }
    setAnchorId(m.id); // anchor = last single-clicked item
    if (additive) {
      toggleMediaSelection(m.id, true);
      syncSourcePreview(useUi.getState().mediaSelection); // toggled state is the truth
    } else {
      setMediaSelection([m.id]);
      syncSourcePreview([m.id]);
    }
  };

  /* §4.9 media-pool menu — Reveal / Copy / Move to… / Remove */
  const buildMenu = (m: MediaRecord): MenuItem[] => {
    const countUses = () => useUi
      .getState()
      .scenes.reduce((n, sc) => n + sc.tracks.reduce((k, t) => k + t.elements.filter((el) => el.mediaId === m.id).length, 0), 0);
    return [
      /* §4.9 media-menu enumeration — Insert/Rename/Properties are honest
         disabled rows (mock limits), the wired commands follow. */
      { id: 'insert-at-playhead', label: 'Insert at Playhead', disabled: true, tip: 'mock: drag the card onto a lane instead (§4.2)' },
      { id: 'rename', label: 'Rename', disabled: true, tip: 'mock: name edits not modeled' },
      { id: 'properties', label: 'Properties', disabled: true, tip: 'mock: media inspector panel is not specced' },
      { id: 'reveal', label: 'Reveal in timeline', sep: true, onSelect: () => reveal(m) },
      { id: 'copy', label: 'Copy', shortcut: '⌘C', onSelect: () => pushToast({ kind: 'info', title: `Copied "${m.name}" (mock)`, detail: 'real shell: copy (spec 15 §4.3.69) — mock has no clipboard' }) },
      { id: 'moveto', label: 'Move to…', disabled: true, tip: 'mock: flat pool — no bins (18 §8.14)' },
      {
        id: 'remove',
        label: 'Remove from pool',
        sep: true,
        danger: true,
        onSelect: () => {
          const uses = countUses();
          if (uses > 0) {
            pushToast({ kind: 'error', title: `In use by ${uses} clips — remove blocked (mock)`, detail: 'removeMediaAsset lands with the engine round; blocked while elements reference the asset' });
            return;
          }
          setRemovedIds((ids) => (ids.includes(m.id) ? ids : [...ids, m.id]));
          const remaining = useUi.getState().mediaSelection.filter((x) => x !== m.id);
          setMediaSelection(remaining);
          syncSourcePreview(remaining); // selection changed — preview follows
          pushToast({ kind: 'success', title: `Removed "${m.name}" (mock)`, detail: 'pool-only removal — the store has no removeMediaAsset action yet' });
        },
      },
    ];
  };

  const onItemContextMenu = (e: React.MouseEvent, m: MediaRecord) => {
    e.preventDefault();
    e.stopPropagation();
    if (!mediaSelection.includes(m.id)) setMediaSelection([m.id]);
    setActiveId(m.id);
    setAnchorId(m.id);
    menu.open(e.clientX, e.clientY, buildMenu(m), MENU_NAME);
  };

  /* drag source: custom type + id; native drag image suppressed — the pool
     ghost follows the pointer and lane dropEffect drives the cursor */
  const onItemDragStart = (e: React.DragEvent, m: MediaRecord) => {
    e.dataTransfer.setData(POOL_DRAG_TYPE, m.id);
    e.dataTransfer.setData('text/plain', m.id);
    e.dataTransfer.effectAllowed = 'copy';
    const blank = document.createElement('canvas');
    blank.width = 1;
    blank.height = 1;
    e.dataTransfer.setDragImage(blank, 0, 0);
    setMediaDrag({ mediaId: m.id, overTrackId: null, allowed: false });
    setGhost({ x: e.clientX, y: e.clientY });
  };
  const onItemDragEnd = () => setMediaDrag(null);

  /* whole-body import drop target (external files only; internal card drags
     get dropEffect none — the pool is not a drop zone for its own media) */
  const onBodyDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(POOL_DRAG_TYPE)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setFileOver(true);
  };
  const onBodyDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setFileOver(false);
  };
  const onBodyDrop = (e: React.DragEvent) => {
    setFileOver(false);
    if (e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    const n = e.dataTransfer.files.length;
    if (n > 0) {
      pushToast({ kind: 'success', title: `Imported ${n} file(s) (mock)`, detail: 'probe → persistBlob → thumbnail pipeline lands with spec 15 §5.4' });
    }
  };

  /* local listbox keyboard (§4.2 a11y + §4.9 keyboard route). stopPropagation
     on handled keys keeps the global spec-16 layer (playhead arrows, Space =
     play) from firing while the listbox region owns the keyboard. */
  const onRegionKeyDown = (e: React.KeyboardEvent) => {
    if (isMenuKey(e)) {
      const m = items.find((x) => x.id === activeId);
      if (!m) return;
      e.preventDefault();
      e.stopPropagation();
      /* anchor the keyboard-route menu to the active option (falls back to
         the region when the option element is gone) */
      const anchor = (activeId ? document.getElementById(`pool-opt-${activeId}`) : null) ?? bodyRef.current;
      menu.openForElement(anchor, buildMenu(m), MENU_NAME);
      return;
    }
    const idx = activeId ? items.findIndex((m) => m.id === activeId) : -1;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        if (items.length === 0) return;
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const next = idx === -1 ? (dir === 1 ? 0 : items.length - 1) : clamp(idx + dir, 0, items.length - 1);
        const m = items[next];
        setActiveId(m.id);
        document.getElementById(`pool-opt-${m.id}`)?.scrollIntoView({ block: 'nearest' });
        return;
      }
      case 'Enter': {
        const m = idx >= 0 ? items[idx] : undefined;
        if (!m) return;
        e.preventDefault();
        e.stopPropagation();
        reveal(m);
        return;
      }
      case ' ': {
        const m = idx >= 0 ? items[idx] : undefined;
        if (!m) return;
        e.preventDefault();
        e.stopPropagation();
        setAnchorId(m.id);
        toggleMediaSelection(m.id, true);
        syncSourcePreview(useUi.getState().mediaSelection); // keyboard = same selection law
        return;
      }
      default:
        break;
    }
  };

  const importMock = () =>
    pushToast({ kind: 'info', title: 'Import media', detail: 'File picker is mock — drop files here instead' });

  const loadSample = () => {
    setRemovedIds([]); // §4.10 ships committed media manifests — the pool restores
    loadSampleProject();
    pushToast({ kind: 'success', title: 'Sample project loaded', detail: '30 s demo · 3 video + 1 text + 1 audio + crossfade (18 §4.10)' });
  };

  const totalSec = items.reduce((acc, m) => acc + (m.duration ?? 0), 0);
  const selCount = useMemo(() => {
    const ids = new Set(items.map((m) => m.id));
    return mediaSelection.filter((id) => ids.has(id)).length;
  }, [items, mediaSelection]);
  const dragMedia = mediaDrag ? project.media.find((m) => m.id === mediaDrag.mediaId) : undefined;
  const activeDescendant = !booting && activeId && items.some((m) => m.id === activeId) ? `pool-opt-${activeId}` : undefined;

  const itemProps = (m: MediaRecord): ItemProps => ({
    m,
    selected: mediaSelection.includes(m.id),
    active: activeId === m.id,
    onClick: (e) => onItemClick(e, m),
    onDoubleClick: () => reveal(m),
    onContextMenu: (e) => onItemContextMenu(e, m),
    onDragStart: (e) => onItemDragStart(e, m),
    onDragEnd: onItemDragEnd,
  });

  return (
    <div data-testid="shell-mediapool" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      {/* header row — import + search + sort/dir + view (never wraps, §9) */}
      <div className="flex items-center gap-1 border-b border-hairline px-2 py-1.5">
        {/* th_mto2t03u: the Import button now carries a proper IMPORT glyph
            (Download — media flows INTO the project); the old Upload arrow
            read as an export affordance. Same aria-label + mock toast. */}
        <button
          type="button"
          className="icon-btn !h-[22px] !w-[22px] shrink-0"
          onClick={importMock}
          aria-label="Import media"
          data-tip="Import media (⌘I)"
        >
          <Download size={13} strokeWidth={1.6} />
        </button>
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search size={12} strokeWidth={1.6} className="absolute left-1.5 text-tfaint" aria-hidden="true" />
          <input
            value={searchInput}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search media"
            aria-label="Search media"
            className="field w-full pl-6 pr-6"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-1 text-tfaint hover:text-tprimary">
              <X size={11} strokeWidth={1.6} aria-hidden="true" />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Sort media"
          className="field w-[58px] shrink-0 cursor-pointer"
          title="Sort media"
        >
          <option value="name">Name</option>
          <option value="duration">Dur.</option>
          <option value="date">Date</option>
          <option value="type">Type</option>
        </select>
        <button
          type="button"
          className="icon-btn !h-[22px] !w-[22px] shrink-0"
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
          data-tip={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
        >
          {sortDir === 'asc' ? <ArrowUpNarrowWide size={13} strokeWidth={1.6} /> : <ArrowDownWideNarrow size={13} strokeWidth={1.6} />}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={`icon-btn !h-[22px] !w-[22px] ${mediaView === 'grid' ? 'toggled' : ''}`}
            onClick={() => setMediaView('grid')}
            data-tip="Grid view"
            aria-label="Grid view"
            aria-pressed={mediaView === 'grid'}
          >
            <LayoutGrid size={13} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            className={`icon-btn !h-[22px] !w-[22px] ${mediaView === 'list' ? 'toggled' : ''}`}
            onClick={() => setMediaView('list')}
            data-tip="List view"
            aria-label="List view"
            aria-pressed={mediaView === 'list'}
          >
            <List size={13} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* body — the listbox region is the whole import drop target */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={bodyRef}
          role="listbox"
          aria-label="Media pool"
          aria-multiselectable="true"
          aria-activedescendant={activeDescendant}
          aria-busy={booting || undefined}
          tabIndex={0}
          className="scroll-y min-h-0 flex-1 p-2"
          onPointerDown={(e) => e.currentTarget.focus()} // roving focus: cards are not tab stops
          onKeyDown={onRegionKeyDown}
          onDragOver={onBodyDragOver}
          onDragLeave={onBodyDragLeave}
          onDrop={onBodyDrop}
        >
          {booting ? (
            /* loading state row — 6 skeleton cards, grid layout preserved */
            <div data-testid="shell-mediapool-state-loading" className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-soft" aria-hidden="true">
                  <div className="skel aspect-video w-full border-b border-hairline" />
                  <div className="flex flex-col gap-1.5 px-2 py-2">
                    <div className="skel h-[9px] w-[78%]" />
                    <div className="skel h-[9px] w-[52%]" />
                  </div>
                </div>
              ))}
            </div>
          ) : poolSize === 0 ? (
            /* empty state row (§4.2 table + §4.10 sample project) */
            <div data-testid="shell-mediapool-state-empty" className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
              <Clapperboard size={14} strokeWidth={1.6} className="text-tfaint" aria-hidden="true" />
              <p className="text-[12px] text-tprimary">Media pool is empty</p>
              <p className="text-[11px] text-tmuted">Import media, or drop files anywhere in this panel</p>
              <button
                type="button"
                onClick={importMock}
                className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-[11px] font-semibold"
                style={{ background: 'var(--accent-selection)', color: 'var(--accent-contrast)' }}
              >
                <Download size={13} strokeWidth={1.6} aria-hidden="true" /> Import media
                <span className="mono opacity-70">⌘I</span>
              </button>
              <button type="button" onClick={loadSample} className="mini-btn">
                <Clapperboard size={13} strokeWidth={1.6} aria-hidden="true" /> Load sample project
              </button>
            </div>
          ) : items.length === 0 ? (
            /* no-result state row — search matched nothing */
            <div data-testid="shell-mediapool-state-noresult" className="flex flex-col items-center gap-2 py-8 text-center">
              <Search size={20} strokeWidth={1.6} className="text-tfaint" aria-hidden="true" />
              <p className="text-[12px] text-tmuted">No clips match "{searchInput}"</p>
              <button type="button" onClick={clearSearch} className="text-[11px] text-accent underline-offset-2 hover:underline">
                Clear search
              </button>
            </div>
          ) : mediaView === 'grid' ? (
            <div className="grid grid-cols-2 gap-2">
              {items.map((m) => <MediaCard key={m.id} {...itemProps(m)} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {items.map((m) => <MediaRow key={m.id} {...itemProps(m)} />)}
            </div>
          )}
        </div>

        {/* dashed-accent import overlay while external files are over the body */}
        {fileOver && (
          <div className="pool-drop-overlay" aria-hidden="true">
            <Download size={14} strokeWidth={1.6} className="text-accent" />
            <span className="text-[11px] font-semibold text-accent">Drop files to import</span>
          </div>
        )}
      </div>

      {/* footer — live counts, aria-live (§4.2): counted from the snapshot,
          never cached */}
      <div
        aria-live="polite"
        className="flex items-center gap-2 border-t border-hairline px-2.5 py-1 text-[11px] text-tmuted"
      >
        <Clock3 size={13} strokeWidth={1.6} aria-hidden="true" />
        <span>
          {items.length} clip{items.length === 1 ? '' : 's'}
          {selCount > 0 ? ` · ${selCount} selected` : ''}
          {` · ${totalDuration(totalSec)} total`}
        </span>
        <span className="grow" />
        <span className="mono">{project.settings.fps} fps</span>
      </div>

      {/* §4.9 media-pool context menu (right-click + Shift+F10 routes) */}
      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}

      {/* §4.2 v1.1 drag ghost — thumbnail + name at the pointer, 50% opacity */}
      {mediaDrag && dragMedia && ghost && (
        <div
          className="pool-drag-ghost"
          data-testid="pool-drag-ghost"
          aria-hidden="true"
          style={{ left: ghost.x + 14, top: ghost.y + 10 }}
        >
          <div className="h-[26px] w-[46px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-hairline">
            <Thumb m={dragMedia} small />
          </div>
          <span className="max-w-[130px] truncate text-[11px] text-tprimary">{dragMedia.name}</span>
        </div>
      )}
    </div>
  );
}

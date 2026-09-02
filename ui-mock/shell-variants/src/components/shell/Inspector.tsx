/* InspectorPanel — spec 18 §4.4: exactly 4 tabs (mock's 6 → ours).
   Source-asset card, model-backed parameter groups (spec 09 ceiling),
   commit-on-release semantics (mock: local state only). Tab visibility:
   hidden-not-disabled per §4.4. */

import { AudioWaveform, Video, ArrowLeftRight, MoreHorizontal, History } from 'lucide-react';
import { useUi, type InspectorTab } from '../../state/useUiStore';
import { findElement, mediaById, type ElementJSON } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

const TABS: { id: InspectorTab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'video', label: 'Video', icon: Video },
  { id: 'audio', label: 'Audio', icon: AudioWaveform },
  { id: 'effects', label: 'Effects', icon: SparkleIcon },
  { id: 'transition', label: 'Transition', icon: ArrowLeftRight },
];

function SparkleIcon(props: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 1.6}>
      <path d="M15 4l1.5 3 3 1.5-3 1.5L15 13l-1.5-3-3-1.5 3-1.5z" />
      <path d="M6 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </svg>
  );
}

function ParamRow({ label, value, min = 0, max = 100, step = 1, unit = '', decimals = 0 }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string; decimals?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[86px] shrink-0 text-[11px] text-tmuted">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={() => { /* mock — no-op, value display only */ }}
        className="min-w-0 flex-1"
      />
      <input
        className="mono w-[58px] shrink-0 rounded-[var(--radius-sm)] border border-soft bg-inset px-1 py-[2px] text-right text-[11px] text-tprimary focus:border-[var(--accent-focus)] focus:outline-none"
        defaultValue={`${value.toFixed(decimals)}${unit}`}
        aria-label={`${label} value`}
        title="Accepts TC (HH:MM:SS:FF), seconds, or frames (123f) — spec 18 §4.4"
      />
    </div>
  );
}

function Group({ title, children, onReset }: { title: string; children: React.ReactNode; onReset?: () => void }) {
  return (
    <div className="border-b border-hairline px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">{title}</span>
        {onReset && (
          <button
            onClick={onReset}
            data-tip="Reset group to spec 09 defaults"
            className="text-[11px] text-tfaint hover:text-accent"
            aria-label={`Reset ${title}`}
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function SourceCard({ el }: { el: ElementJSON }) {
  const m = mediaById(el.mediaId);
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline px-3 py-2.5">
      <div className="h-[38px] w-[64px] shrink-0 overflow-hidden rounded-[var(--radius)] border border-hairline bg-inset">
        {m?.thumbnail ? (
          <img src={m.thumbnail} alt="" aria-hidden="true" className={`h-full w-full object-cover ${m.offline ? 'opacity-40 grayscale' : ''}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-tfaint">{m ? 'AUDIO' : 'TEXT'}</div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[11.5px] font-medium text-tprimary">{el.name}</span>
        <span className="mono text-[11px] text-tmuted">
          {m ? `${m.width ?? '—'}×${m.height ?? '—'} · ${m.fps ?? '—'}p · ${m.duration !== null ? tc(m.duration) : '—'}` : 'text element'}
        </span>
      </div>
    </div>
  );
}

export function Inspector() {
  const selection = useUi((s) => s.selection);
  const scenes = useUi((s) => s.scenes);
  const tab = useUi((s) => s.inspectorTab);
  const setTab = useUi((s) => s.setInspectorTab);

  const found = selection.length === 1 ? findElement(scenes, selection[0]) : null;
  const el = found?.element ?? null;
  const isAudio = el?.type === 'audio';
  const isText = el?.type === 'text';
  const isTransitionFocus = tab === 'transition' && !!el?.transitionOut;

  // tab visibility: hidden-not-disabled (spec 18 §4.4)
  const visibleTabs = TABS.filter((t) => {
    if (!el) return t.id === 'video';
    if (t.id === 'audio') return isAudio || el.type === 'video'; // audio-bearing
    if (t.id === 'transition') return !!el.transitionOut;
    return true;
  });
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? 'video';

  return (
    <div data-testid="shell-inspector" className="flex h-full min-h-0 flex-col border-l border-hairline bg-shell">
      {/* inspector toolbar — actions only (chrome trimmed per review) */}
      <div className="flex items-center gap-1.5 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <button className="icon-btn !h-[18px] !w-[18px]" data-tip="Inspector history" aria-label="Inspector history">
          <History size={12} strokeWidth={1.7} />
        </button>
        <div className="grow" />
        <button className="icon-btn !h-[18px] !w-[18px]" data-tip="More" aria-label="More inspector actions">
          <MoreHorizontal size={13} strokeWidth={1.7} />
        </button>
      </div>

      {/* header */}
      <div className="flex items-center border-b border-hairline px-3" style={{ height: 30, minHeight: 30 }}>
        <span className="truncate text-[12.5px] font-semibold text-tprimary">
          {el ? (selection.length > 1 ? `${selection.length} clips selected` : el.name) : 'Nothing to inspect'}
        </span>
      </div>

      {/* 4 tabs */}
      <div
        role="tablist"
        aria-label="Inspector tabs"
        className="flex shrink-0 items-center justify-around border-b border-hairline px-2 py-1.5"
        style={{ height: 64, minHeight: 64 }}
      >
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={active}
              aria-controls={`insp-${t.id}`}
              data-testid={`shell-inspector-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 transition-colors ${active ? 'bg-[var(--active-overlay)] text-tprimary' : 'text-tfaint hover:text-tmuted'}`}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span className="text-[11px]">{t.label}</span>
              {active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full" style={{ background: 'var(--accent-selection)' }} />}
            </button>
          );
        })}
      </div>

      {/* content */}
      <div id={`insp-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="scroll-y min-h-0 flex-1">
        {!el ? (
          <div className="flex h-full items-center justify-center text-[13px] text-tfaint" data-testid="shell-inspector-state-empty">
            Nothing to inspect
          </div>
        ) : activeTab === 'video' && !isText ? (
          <>
            <SourceCard el={el} />
            <Group title="Transform" onReset={() => {}}>
              <ParamRow label="Position X" value={960} min={-1920} max={1920} />
              <ParamRow label="Position Y" value={540} min={-1080} max={1080} />
              <ParamRow label="Scale" value={(el.opacity ?? 1) >= 0 ? 100 : 100} min={10} max={400} unit="%" />
              <ParamRow label="Rotation" value={0} min={-180} max={180} unit="°" />
              <ParamRow label="Opacity" value={Math.round((el.opacity ?? 1) * 100)} max={100} unit="%" />
            </Group>
            <Group title="Speed" onReset={() => {}}>
              <ParamRow label="Rate" value={Math.round((el.speed ?? 1) * 100)} min={10} max={400} unit="%" />
              <label className="flex items-center gap-2 pt-0.5 text-[11px] text-tmuted">
                <input type="checkbox" defaultChecked className="accent-[var(--accent-focus)]" />
                Preserve pitch
              </label>
            </Group>
          </>
        ) : activeTab === 'audio' || (activeTab === 'video' && isText) ? (
          <>
            {!isText && <SourceCard el={el} />}
            <Group title="Audio" onReset={() => {}}>
              <ParamRow label="Gain" value={Math.round((el.volume ?? 1) * 100) - 100} min={-60} max={12} unit=" dB" />
              <ParamRow label="Pan" value={0} min={-100} max={100} unit="" />
              <ParamRow label="Fade in" value={el.audioFadeIn ?? 0} min={0} max={5} step={0.1} unit="s" decimals={1} />
              <ParamRow label="Fade out" value={el.audioFadeOut ?? 0} min={0} max={5} step={0.1} unit="s" decimals={1} />
            </Group>
          </>
        ) : activeTab === 'effects' ? (
          <Group title="Effects" onReset={() => {}}>
            {(el.effects ?? []).map((fx) => (
              <div key={fx.id} className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-soft px-2 py-1.5">
                <span className="text-[11.5px] text-tprimary">{fx.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-tfaint">{fx.enabled ? 'on' : 'off'}</span>
                  <input
                    type="checkbox"
                    checked={fx.enabled}
                    onChange={() => useUi.getState().toggleEffect(el.id, fx.id)}
                    aria-label={`Toggle ${fx.name}`}
                    className="accent-[var(--accent-focus)]"
                  />
                </span>
              </div>
            ))}
            <button className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-strong py-1.5 text-[11px] text-tmuted hover:border-accent hover:text-tprimary">
              + Add effect
            </button>
          </Group>
        ) : (
          <Group title="Transition" onReset={() => {}}>
            <div className="flex items-center gap-2">
              <span className="w-[86px] shrink-0 text-[11px] text-tmuted">Presentation</span>
              <select defaultValue={el.transitionOut?.presentation ?? 'fade'} className="field flex-1 cursor-pointer" aria-label="Transition presentation">
                <option value="fade">Fade</option>
                <option value="dip-to-black">Dip to black</option>
                <option value="wipe-left">Wipe left</option>
                <option value="push-left">Push left</option>
              </select>
            </div>
            <ParamRow label="Duration" value={el.transitionOut?.duration ?? 0.5} min={0.1} max={2} step={0.05} unit="s" decimals={2} />
            <ParamRow label="Alignment" value={Math.round((el.transitionOut?.alignment ?? 0.5) * 100)} min={0} max={100} unit="%" />
            <p className="pt-1 text-[10px] leading-snug text-tfaint">
              27 registry presentations available (spec 07 §6.3); four shown in mock.
            </p>
            {isTransitionFocus && (
              <p className="mono rounded border border-soft bg-inset px-2 py-1 text-[10px] text-tmuted">
                boundary {tc(el.startTime + el.duration)} · crossfade
              </p>
            )}
          </Group>
        )}
      </div>
    </div>
  );
}

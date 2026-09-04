/* InspectorPanel — spec 18 §4.4: exactly 4 tabs (mock's 6 → ours), the
   v1.1 field contracts, uniform commit semantics, mixed multi-select,
   hidden-not-disabled tab visibility.

   Commit semantics (§4.4 "uniform commit semantics"):
   - NumberField (EVERY numeric/text field): live preview on keystroke
     behind a 50ms debounce — one store write per settle, never per
     keystroke; Enter and blur settle pending input immediately; invalid
     input = red 1px border + inline message + focus retained, nothing
     dispatched. Time-based fields parse through the ONE shared parser
     (parseTc in lib/timecode: "HH:MM:SS:FF" | "SS.s" | "Nf").
   - Sliders: local drag state (live preview), one commit on release.
   - Double-click a field/slider resets it to its spec 09 default (§5A)
     through the same write path as the group Reset — a command, not a
     local re-render.

   Honest mock boundaries (each commented at its site):
   - position/scale/rotation/flip, gain-dB/pan, preserve-pitch have NO
     ElementJSON field → component-local state keyed by element id; the
     real shell persists them to spec 09 (transform resolver §07 5.4,
     retime §06 5.11, audio §03 9). Not written through setElementField
     because the model has nowhere to put them.
   - Multi-select commits fan out one store write per element; the real
     shell sends one coalesced updateElements batch (spec 15 §7).
   - Effect reorder patches the effects array via setElementField (the
     store has no reorder action); real shell = reorderEffect (spec 15
     §4.3.55).
   - transitionOut removal has no store action and no type-safe patch →
     the button renders disabled with an explanatory tooltip.
   - Tab visibility: hidden-not-disabled (§4.4) — Video for visual
     (video/image/text), Audio for audio-bearing (video/audio), Effects
     always, Transition when the element has one or a cut follows. */

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  ArrowLeftRight, AudioWaveform, ChevronDown, ChevronUp, FlipHorizontal, FlipVertical,
  History, MoreHorizontal, Plus, Sparkles, Video, X,
} from 'lucide-react';
import { useUi, type InspectorTab } from '../../state/useUiStore';
import {
  EFFECT_DEFS, TRANSITION_PRESENTATIONS, findElement, mediaById,
  type EffectJSON, type ElementJSON, type TransitionJSON, type TransitionPresentation,
} from '../../lib/mockData';
import { clamp, parseTc, tc } from '../../lib/timecode';

/* ---- shared bits ------------------------------------------------------ */

const TABS: { id: InspectorTab; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'video', label: 'Video', icon: Video },
  { id: 'audio', label: 'Audio', icon: AudioWaveform },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'transition', label: 'Transition', icon: ArrowLeftRight },
];

const VISUAL: ReadonlySet<ElementJSON['type']> = new Set(['video', 'image', 'text']);
const audioBearing = (e: ElementJSON) => e.type === 'audio' || e.type === 'video';

/* spec 09 defaults — drive per-group Reset + §5A double-click reset */
const DEFAULT_MT = { x: 960, y: 540, scale: 100, rot: 0 }; // canvas-center, unflipped
const DEFAULT_MA = { gainDb: 0, pan: 0 };
type MockTransform = typeof DEFAULT_MT;
type MockAudio = typeof DEFAULT_MA;

/* nominal effect-param defaults — mockData's EFFECT_DEFS carries no default
   column (the spec 07 registry does); these seed display + new additions */
const PARAM_DEFAULTS: Record<string, number> = {
  radius: 12, length: 24, angle: 0, amount: 50, feather: 50, intensity: 50, offset: 5,
};

type EffectDef = (typeof EFFECT_DEFS)[number];
type ParamDef = EffectDef['params'][number];

function defaultsFor(def: EffectDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of def.params) out[p.key] = PARAM_DEFAULTS[p.key] ?? p.min;
  return out;
}

/** next element on the same track — "a cut follows" (§4.4 transition visibility) */
function nextOnTrack(elements: ElementJSON[], el: ElementJSON): ElementJSON | null {
  const end = el.startTime + el.duration;
  const following = elements.filter((e) => e.id !== el.id && e.startTime >= end - 1e-6);
  following.sort((a, b) => a.startTime - b.startTime);
  return following[0] ?? null;
}

/** common value across a multi-selection; mixed=true when values differ */
function commonOf<T>(vals: T[]): { mixed: boolean; value: T } {
  const value = vals[0] as T;
  return { value, mixed: vals.some((v) => v !== value) };
}

/* ---- NumberField: the §4.4 field contract ----------------------------- */

function NumberField({
  value, min, max, unit = '', decimals = 0, timeField = false, blank = false,
  placeholder, resetTo, ariaLabel, onCommit,
}: {
  value: number;
  min: number;
  max: number;
  unit?: string;
  decimals?: number;
  /** parse through the shared TC parser (time-based fields) */
  timeField?: boolean;
  /** mixed multi-select: render empty until the user types (then it writes all) */
  blank?: boolean;
  placeholder?: string;
  /** spec 09 default for the §5A double-click reset */
  resetTo?: number;
  ariaLabel: string;
  onCommit: (v: number) => void;
}) {
  const fmt = (v: number) => `${v.toFixed(decimals)}${unit}`;
  const [text, setText] = useState(() => (blank ? '' : fmt(value)));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const timer = useRef<number | null>(null);
  const commitRef = useRef(onCommit);
  useEffect(() => { commitRef.current = onCommit; });

  // resync the display when the committed value moves underneath us and
  // the user isn't mid-edit (slider release, group reset, undo, selection)
  useEffect(() => {
    if (!focused.current) {
      setText(blank ? '' : fmt(value));
      setError(null);
    }
  }, [value, blank]);

  // drop any pending debounce on unmount
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const parse = (raw: string): number | null => {
    if (timeField) return parseTc(raw);
    return /^\s*-?(\d+(\.\d+)?|\.\d+)\s*$/.test(raw) ? Number(raw) : null;
  };

  const validate = (raw: string): { v: number | null; err: string | null } => {
    const trimmed = raw.trim();
    if (trimmed === '') return { v: null, err: 'Enter a value' };
    const v = parse(trimmed);
    if (v === null || !Number.isFinite(v)) {
      return { v: null, err: timeField ? 'Invalid — HH:MM:SS:FF, SS.s or Nf' : 'Not a number' };
    }
    if (v < min || v > max) return { v: null, err: `Range ${min}…${max}${unit}` };
    return { v, err: null };
  };

  const clearTimer = () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
  };

  const revert = () => { setText(blank ? '' : fmt(value)); setError(null); };

  /** settle pending input now (Enter / blur) — one commit. Non-mixed keeps
   *  the no-op guard (r.v !== value); a MIXED multi-select field commits
   *  unconditionally: `value` is only the FIRST selected element's aggregate
   *  while the others differ, so typing exactly that number must still fan
   *  the write out to every selected element (§4.4 "typing sets all
   *  selected" — R13 CodeRabbit fix). */
  const settle = () => {
    clearTimer();
    const r = validate(text);
    if (r.v !== null && (blank || r.v !== value)) commitRef.current(r.v);
    return r;
  };

  const onChange = (raw: string) => {
    setText(raw);
    const r = validate(raw);
    if (r.v !== null) {
      setError(null);
      clearTimer();
      // live preview: one commit per 50ms settle, never per keystroke (§4.4)
      const v = r.v;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (focused.current && v !== value) commitRef.current(v);
      }, 50);
    } else {
      clearTimer();
      setError(r.err);
    }
  };

  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error !== null}
        title={timeField ? 'Accepts TC (HH:MM:SS:FF), seconds (SS.s) or frames (123f) — spec 18 §4.4' : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          const r = settle();
          if (r.v !== null) setText(fmt(r.v));
          else revert(); // invalid on blur: revert display, nothing dispatched
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const r = settle();
            if (r.v !== null) setText(fmt(r.v));
            // invalid → red border + message stay, focus retained, no commit
          } else if (e.key === 'Escape') {
            clearTimer();
            revert();
          }
        }}
        onDoubleClick={() => {
          // §5A: double-click resets to the spec 09 default via the same
          // commit path as the group Reset (undoable write, not a re-render)
          if (resetTo === undefined) return;
          clearTimer();
          setText(fmt(resetTo));
          setError(null);
          commitRef.current(resetTo);
        }}
        className={`mono w-[64px] rounded-[var(--radius-sm)] border bg-inset px-1 py-[2px] text-right text-[11px] focus:outline-none ${
          error ? 'num-field-invalid border-[var(--danger,#e5484d)]' : 'border-soft text-tprimary focus:border-[var(--accent-focus)]'
        }`}
      />
      {error && <span className="num-field-msg" role="alert">{error}</span>}
    </span>
  );
}

/* ---- ParamRow: label + slider (commit-on-release) + NumberField ------- */

function ParamRow({
  label, value, mixed = false, min, max, step = 1, unit = '', decimals = 0,
  timeField = false, resetTo, title, onCommit,
}: {
  label: string;
  value: number;
  mixed?: boolean;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  decimals?: number;
  timeField?: boolean;
  resetTo?: number;
  title?: string;
  onCommit: (v: number) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const release = () => {
    if (drag !== null) { onCommit(drag); setDrag(null); }
  };
  return (
    <div className="flex items-center gap-2">
      <span className="w-[86px] shrink-0 text-[11px] text-tmuted" title={title}>{label}</span>
      {mixed ? (
        /* §4.4 mixed multi-select: values differ across the selection — the
           slider hides (no honest position), typing a value writes ALL */
        <span className="chip-mixed" data-testid="chip-mixed-values">Mixed values</span>
      ) : (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={shown}
          aria-label={`${label} slider`}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={release}
          onPointerCancel={() => setDrag(null)}
          onKeyUp={release}
          onDoubleClick={() => { if (resetTo !== undefined) { setDrag(null); onCommit(resetTo); } }}
          className="min-w-0 flex-1"
        />
      )}
      <NumberField
        value={shown}
        blank={mixed}
        min={min}
        max={max}
        unit={unit}
        decimals={decimals}
        timeField={timeField}
        resetTo={resetTo}
        placeholder={mixed ? '—' : undefined}
        ariaLabel={mixed ? `${label} — mixed values; typing sets all selected` : `${label} value`}
        onCommit={onCommit}
      />
    </div>
  );
}

/* ---- group shell with per-group reset (§4.4) --------------------------- */

function Group({ title, children, onReset }: { title: string; children: ReactNode; onReset?: () => void }) {
  return (
    <div className="border-b border-hairline px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-tmuted">{title}</span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            data-tip="Reset group to spec 09 defaults"
            className="text-[11px] text-tmuted hover:text-accent"
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

/* ---- source-asset card + quick-seek (§4.4) ----------------------------- */

function SourceCard({ el }: { el: ElementJSON }) {
  const setPlayhead = useUi((s) => s.setPlayhead);
  const m = mediaById(el.mediaId);
  const inT = el.startTime;
  const midT = el.startTime + el.duration / 2;
  const outT = el.startTime + el.duration;
  const seeks: { label: string; time: number; btn: string; testid: string }[] = [
    { label: 'In', time: inT, btn: '→ In', testid: 'quick-seek-in' },
    { label: 'Mid', time: midT, btn: '→ Mid', testid: 'quick-seek-mid' },
    { label: 'Out', time: outT, btn: '→ Out', testid: 'quick-seek-out' },
  ];
  return (
    <div className="border-b border-hairline px-3 py-2.5">
      <div className="flex items-center gap-2.5">
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
      {/* quick-seek rows: pure setPlayhead commands, no state change (§4.4) */}
      <div className="mt-2 flex flex-col gap-1">
        {seeks.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-[28px] shrink-0 text-[11px] text-tmuted">{s.label}</span>
            <span className="mono text-[11px] text-tprimary">{tc(s.time)}</span>
            <div className="grow" />
            <button
              type="button"
              className="mini-btn"
              data-testid={s.testid}
              data-tip={`Seek playhead to ${s.label} (${tc(s.time)})`}
              onClick={() => setPlayhead(s.time)}
              aria-label={`Seek playhead to ${s.label} at ${tc(s.time)}`}
            >
              {s.btn}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Effects tab (single selection) ------------------------------------ */

function FxParamRow({ el, fx, p }: { el: ElementJSON; fx: EffectJSON; p: ParamDef }) {
  const setEffectParam = useUi((s) => s.setEffectParam);
  const [drag, setDrag] = useState<number | null>(null);
  const fallback = PARAM_DEFAULTS[p.key] ?? p.min;
  const committed = fx.params?.[p.key] ?? fallback;
  const shown = drag ?? committed;
  const decimals = p.step < 1 ? 1 : 0;
  const commit = (v: number) => setEffectParam(el.id, fx.id, p.key, clamp(v, p.min, p.max));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-tmuted">{p.label}</span>
        {/* value badge — live readout of the committed param */}
        <span className="insp-badge" data-testid="fx-param-value">
          {shown.toFixed(decimals)}{p.unit ? ` ${p.unit}` : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step}
          value={shown}
          aria-label={`${fx.name} ${p.label} slider`}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={() => { if (drag !== null) { commit(drag); setDrag(null); } }}
          onPointerCancel={() => setDrag(null)}
          onKeyUp={() => { if (drag !== null) { commit(drag); setDrag(null); } }}
          onDoubleClick={() => { setDrag(null); commit(fallback); }}
          className="min-w-0 flex-1"
        />
        <NumberField
          value={shown}
          min={p.min}
          max={p.max}
          unit={p.unit}
          decimals={decimals}
          resetTo={fallback}
          ariaLabel={`${fx.name} ${p.label}`}
          onCommit={commit}
        />
      </div>
    </div>
  );
}

function EffectsTab({ el }: { el: ElementJSON }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggleEffect = useUi((s) => s.toggleEffect);
  const removeEffect = useUi((s) => s.removeEffect);
  const addEffectToElement = useUi((s) => s.addEffectToElement);
  const setElementField = useUi((s) => s.setElementField);
  const list = el.effects ?? [];
  const onClip = new Set(list.map((f) => f.name));
  const available = EFFECT_DEFS.filter((d) => !onClip.has(d.name));

  const move = (fxId: string, dir: -1 | 1) => {
    const idx = list.findIndex((f) => f.id === fxId);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= list.length) return;
    const next = list.slice();
    const tmp = next[idx];
    next[idx] = next[to];
    next[to] = tmp;
    /* mock: the store exposes no reorderEffect — patch the effects array
       through setElementField (a type-safe ElementJSON field). Real shell:
       reorderEffect (spec 15 §4.3.55). */
    setElementField(el.id, { effects: next });
  };

  return (
    <Group title="Effects">
      {list.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-soft px-2 py-1.5 text-[11px] text-tmuted">
          No effects
        </div>
      )}
      {list.map((fx, i) => {
        const def = EFFECT_DEFS.find((d) => d.name === fx.name);
        return (
          <div key={fx.id} className="rounded-[var(--radius)] border border-soft">
            <div className="flex items-center gap-1 border-b border-hairline px-2 py-1">
              <span className={`min-w-0 flex-1 truncate text-[11.5px] ${fx.enabled ? 'text-tprimary' : 'text-tmuted'}`}>{fx.name}</span>
              <span className="text-[11px] text-tmuted">{fx.enabled ? 'on' : 'off'}</span>
              <input
                type="checkbox"
                checked={fx.enabled}
                onChange={() => toggleEffect(el.id, fx.id)}
                aria-label={`Enable ${fx.name}`}
                className="accent-[var(--accent-focus)]"
              />
              <button
                type="button"
                className="icon-btn disabled icon-btn-sm"
                disabled={i === 0}
                onClick={() => move(fx.id, -1)}
                aria-label={`Move ${fx.name} up`}
                data-tip="Reorder (mock: effects-array patch, real: reorderEffect)"
              >
                <ChevronUp size={12} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                className="icon-btn disabled icon-btn-sm"
                disabled={i === list.length - 1}
                onClick={() => move(fx.id, 1)}
                aria-label={`Move ${fx.name} down`}
              >
                <ChevronDown size={12} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => removeEffect(el.id, fx.id)}
                aria-label={`Remove ${fx.name}`}
                data-tip="Remove effect"
              >
                <X size={12} strokeWidth={1.6} />
              </button>
            </div>
            {def && def.params.length > 0 && (
              <div className={`flex flex-col gap-2 px-2 py-1.5 ${fx.enabled ? '' : 'opacity-55'}`}>
                {def.params.map((p) => (
                  <FxParamRow key={p.key} el={el} fx={fx} p={p} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {pickerOpen ? (
        <div className="flex flex-col gap-0.5 rounded-[var(--radius)] border border-soft bg-inset p-1" role="menu" aria-label="Add effect">
          {available.length === 0 ? (
            <span className="px-2 py-1 text-[11px] text-tmuted">
              All {EFFECT_DEFS.length} registry effects applied
            </span>
          ) : (
            available.map((d) => (
              <button
                key={d.name}
                type="button"
                role="menuitem"
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-left text-[11px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
                onClick={() => {
                  /* params seeded with nominal defaults (mockData's EFFECT_DEFS
                     has no default column — spec 07's registry does) */
                  addEffectToElement(el.id, { name: d.name, enabled: true, params: defaultsFor(d) });
                  setPickerOpen(false);
                }}
              >
                <Plus size={12} strokeWidth={1.6} />
                {d.name}
              </button>
            ))
          )}
          <button
            type="button"
            className="mt-0.5 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-hairline px-2 py-1 text-left text-[11px] text-tmuted hover:text-tprimary"
            onClick={() => setPickerOpen(false)}
          >
            <X size={12} strokeWidth={1.6} />
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-strong py-1.5 text-[11px] text-tmuted hover:border-accent hover:text-tprimary"
          onClick={() => setPickerOpen(true)}
        >
          <Plus size={12} strokeWidth={1.6} /> Add effect
        </button>
      )}
    </Group>
  );
}

/* ---- Transition tab ----------------------------------------------------- */

function TransitionTab({ els, nextEl }: { els: ElementJSON[]; nextEl: ElementJSON | null }) {
  const setTransition = useUi((s) => s.setTransition);
  const trs = els.map((e) => e.transitionOut).filter((t): t is TransitionJSON => t != null);

  if (trs.length !== els.length) {
    // single selection with a following cut but no transition yet — offer
    // creation; setTransition(id, {}) creates the spec 09 default in-store
    const el = els[0];
    return (
      <Group title="Transition">
        <p className="text-[11px] leading-relaxed text-tmuted">
          Hard cut{nextEl ? ` to “${nextEl.name}”` : ''} at {tc(el.startTime + el.duration)}.
        </p>
        <button type="button" className="mini-btn self-start" onClick={() => setTransition(el.id, {})}>
          <Plus size={12} strokeWidth={1.6} /> Add crossfade
        </button>
        <p className="text-[11px] text-tmuted">Creates the spec 09 default: Cross Dissolve · 0.50s · centered.</p>
      </Group>
    );
  }

  const pres = commonOf(trs.map((t) => t.presentation));
  const dur = commonOf(trs.map((t) => t.duration));
  const align = commonOf(trs.map((t) => t.alignment));
  const boundary = els[0];

  return (
    <Group title="Transition">
      <div className="flex items-center gap-2">
        <span className="w-[86px] shrink-0 text-[11px] text-tmuted">Presentation</span>
        <select
          className="field flex-1 cursor-pointer"
          aria-label="Transition presentation"
          data-testid="transition-presentation"
          value={pres.mixed ? '__mixed__' : pres.value}
          onChange={(e) => {
            const v = e.target.value as TransitionPresentation;
            els.forEach((el) => setTransition(el.id, { presentation: v }));
          }}
        >
          {pres.mixed && <option value="__mixed__" disabled>Mixed values</option>}
          {/* 27 registry presentations (spec 07 §6.3) */}
          {TRANSITION_PRESENTATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <ParamRow
        label="Duration"
        value={dur.value}
        mixed={dur.mixed}
        min={0.1}
        max={2}
        step={0.05}
        unit="s"
        decimals={2}
        timeField
        resetTo={0.5}
        onCommit={(v) => els.forEach((el) => setTransition(el.id, { duration: v }))}
      />
      <ParamRow
        label="Alignment"
        value={Math.round(align.value * 100)}
        mixed={align.mixed}
        min={0}
        max={100}
        unit="%"
        resetTo={50}
        onCommit={(v) => els.forEach((el) => setTransition(el.id, { alignment: clamp(v, 0, 100) / 100 }))}
        title="0 = starts at the cut · 100 = ends at the cut · 50 = centered on the cut"
      />
      <div className="flex items-center justify-end">
        {/* mock: the store has no removeTransition action and the patch type
            can't express "unset" — disabled with the reason, not type-unsafe */}
        <button
          type="button"
          aria-disabled="true"
          data-tip="mock: removal needs store action"
          className="mini-btn"
          aria-label="Remove transition (unavailable in mock)"
        >
          <X size={12} strokeWidth={1.6} /> Remove transition
        </button>
      </div>
      {nextEl && (
        <p className="mono rounded border border-soft bg-inset px-2 py-1 text-[11px] text-tmuted">
          boundary {tc(boundary.startTime + boundary.duration)} · cut to {nextEl.name}
        </p>
      )}
    </Group>
  );
}

/* ---- the panel ----------------------------------------------------------- */

export function Inspector() {
  const selection = useUi((s) => s.selection);
  const scenes = useUi((s) => s.scenes);
  const tab = useUi((s) => s.inspectorTab);
  const setTab = useUi((s) => s.setInspectorTab);
  const setElementField = useUi((s) => s.setElementField);

  /* mock-only model extensions (see header): transform position/scale/
     rotation + flips, gain-dB/pan, preserve-pitch. Keyed by element id —
     survive tab switches and selection changes, reset on reload. The real
     shell persists these to spec 09 via updateElements. */
  const [mockT, setMockT] = useState<Record<string, MockTransform>>({});
  const [flips, setFlips] = useState<ReadonlySet<string>>(() => new Set()); // `${id}:h` | `${id}:v`
  const [mockA, setMockA] = useState<Record<string, MockAudio>>({});
  const [pitch, setPitch] = useState<Record<string, boolean>>({});

  const found = selection
    .map((id) => findElement(scenes, id))
    .filter((f): f is NonNullable<ReturnType<typeof findElement>> => f !== null);
  const els = found.map((f) => f.element);
  const multi = els.length > 1;
  const single = els.length === 1 ? els[0] : null;
  const nextEl = found.length === 1 ? nextOnTrack(found[0].track.elements, found[0].element) : null;

  /** fan-out write — mock: one write per element; real shell = one coalesced
      updateElements batch (spec 15 §7 / spec 06 §4.6) */
  const setFieldAll = (patch: Partial<ElementJSON>) => {
    els.forEach((e) => setElementField(e.id, patch));
  };

  /* common/mixed aggregation over the selection (§4.4) */
  function agg<T>(get: (e: ElementJSON) => T): { mixed: boolean; value: T } {
    return commonOf(els.map(get));
  }

  const mtOf = (id: string): MockTransform => mockT[id] ?? DEFAULT_MT;
  const maOf = (id: string): MockAudio => mockA[id] ?? DEFAULT_MA;
  const setMockTAll = (patch: Partial<MockTransform>) => setMockT((prev) => {
    const next = { ...prev };
    for (const e of els) next[e.id] = { ...(prev[e.id] ?? DEFAULT_MT), ...patch };
    return next;
  });
  const setMockAAll = (patch: Partial<MockAudio>) => setMockA((prev) => {
    const next = { ...prev };
    for (const e of els) next[e.id] = { ...(prev[e.id] ?? DEFAULT_MA), ...patch };
    return next;
  });
  const flipAll = (axis: 'h' | 'v') => {
    const keys = els.map((e) => `${e.id}:${axis}`);
    const on = keys.every((k) => flips.has(k));
    setFlips((prev) => {
      const next = new Set(prev);
      for (const k of keys) (on ? next.delete(k) : next.add(k));
      return next;
    });
  };
  const pitchAll = () => {
    const on = els.every((e) => pitch[e.id] === true);
    setPitch((prev) => {
      const next = { ...prev };
      for (const e of els) next[e.id] = !on;
      return next;
    });
  };

  /* per-group reset (§4.4): model-backed fields go through the store (a
     real, undoable write); mock-local fields drop back to their defaults */
  const resetTransform = () => {
    setFieldAll({ opacity: 1 });
    setMockT((prev) => { const n = { ...prev }; for (const e of els) delete n[e.id]; return n; });
    setFlips((prev) => {
      const n = new Set(prev);
      for (const e of els) { n.delete(`${e.id}:h`); n.delete(`${e.id}:v`); }
      return n;
    });
  };
  const resetSpeed = () => {
    setFieldAll({ speed: 1 });
    setPitch((prev) => { const n = { ...prev }; for (const e of els) delete n[e.id]; return n; });
  };
  const resetLevels = () => setMockA((prev) => {
    const n = { ...prev };
    for (const e of els) delete n[e.id];
    return n;
  });
  const resetFades = () => setFieldAll({ audioFadeIn: 0, audioFadeOut: 0 });

  const allVideo = els.length > 0 && els.every((e) => e.type === 'video');
  const flipH = els.length > 0 && els.every((e) => flips.has(`${e.id}:h`));
  const flipV = els.length > 0 && els.every((e) => flips.has(`${e.id}:v`));
  const pitchOn = els.length > 0 && els.every((e) => pitch[e.id] === true);

  // tab visibility: hidden-not-disabled (spec 18 §4.4)
  const visibleTabs = TABS.filter((t) => {
    if (els.length === 0) return t.id === 'video'; // empty state keeps the mock's strip
    switch (t.id) {
      case 'video': return els.every((e) => VISUAL.has(e.type));
      case 'audio': return els.every(audioBearing);
      case 'transition':
        return multi
          ? els.every((e) => e.transitionOut != null) // common-subset rule
          : !!(single?.transitionOut || nextEl);
      default: return true; // effects — any element
    }
  });
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? 'video';

  return (
    <div data-testid="shell-inspector" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      {/* inspector toolbar — actions only (chrome trimmed per review) */}
      <div className="flex items-center gap-1.5 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <button className="icon-btn icon-btn-sm" data-tip="Inspector history" aria-label="Inspector history">
          <History size={12} strokeWidth={1.7} />
        </button>
        <div className="grow" />
        <button className="icon-btn icon-btn-sm" data-tip="More" aria-label="More inspector actions">
          <MoreHorizontal size={13} strokeWidth={1.7} />
        </button>
      </div>

      {/* header */}
      <div className="flex items-center border-b border-hairline px-3" style={{ height: 30, minHeight: 30 }}>
        <span className="truncate text-[12.5px] font-semibold text-tprimary">
          {els.length === 0
            ? 'Nothing to inspect'
            : multi
              ? `${els.length} clips selected`
              : single?.name}
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
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`insp-${t.id}`}
              data-testid={`shell-inspector-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 transition-colors ${active ? 'bg-[var(--active-overlay)] text-tprimary' : 'text-tmuted hover:text-tprimary'}`}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span className="text-[11px]">{t.label}</span>
              {active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full" style={{ background: 'var(--accent-selection)' }} />}
            </button>
          );
        })}
      </div>

      {/* content — keyed by selection so fields resync on selection change */}
      <div id={`insp-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="scroll-y min-h-0 flex-1">
        {els.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-tmuted" data-testid="shell-inspector-state-empty">
            Nothing to inspect
          </div>
        ) : (
          <div key={els.map((e) => e.id).join('·')} className="flex flex-col">
            {/* ---- Video tab: transform + speed (visual elements) ---- */}
            {activeTab === 'video' && (
              <>
                {!multi && single?.mediaId && <SourceCard el={single} />}
                <Group title="Transform" onReset={resetTransform}>
                  <ParamRow
                    label="Position X"
                    {...agg((e) => mtOf(e.id).x)}
                    min={-1920}
                    max={1920}
                    unit="px"
                    resetTo={DEFAULT_MT.x}
                    onCommit={(v) => setMockTAll({ x: v })}
                  />
                  <ParamRow
                    label="Position Y"
                    {...agg((e) => mtOf(e.id).y)}
                    min={-1080}
                    max={1080}
                    unit="px"
                    resetTo={DEFAULT_MT.y}
                    onCommit={(v) => setMockTAll({ y: v })}
                  />
                  <ParamRow
                    label="Scale"
                    {...agg((e) => mtOf(e.id).scale)}
                    min={10}
                    max={400}
                    unit="%"
                    resetTo={DEFAULT_MT.scale}
                    onCommit={(v) => setMockTAll({ scale: v })}
                  />
                  <ParamRow
                    label="Rotation"
                    {...agg((e) => mtOf(e.id).rot)}
                    min={-180}
                    max={180}
                    unit="°"
                    resetTo={DEFAULT_MT.rot}
                    onCommit={(v) => setMockTAll({ rot: v })}
                  />
                  <ParamRow
                    label="Opacity"
                    {...agg((e) => Math.round((e.opacity ?? 1) * 100))}
                    min={0}
                    max={100}
                    unit="%"
                    resetTo={100}
                    onCommit={(v) => setFieldAll({ opacity: v / 100 })}
                  />
                  <div className="flex items-center gap-2">
                    <span className="w-[86px] shrink-0 text-[11px] text-tmuted">Flip</span>
                    <div className="flex items-center gap-1.5">
                      {/* mock: flips persist to the spec 09 transform in the
                          real shell; ElementJSON has no field → local Set */}
                      <button
                        type="button"
                        aria-pressed={flipH}
                        onClick={() => flipAll('h')}
                        data-tip="Flip horizontal — mock: real shell persists to spec 09 transform"
                        aria-label="Flip horizontal"
                        className="icon-btn boxed icon-btn-sm"
                      >
                        <FlipHorizontal size={12} strokeWidth={1.6} />
                      </button>
                      <button
                        type="button"
                        aria-pressed={flipV}
                        onClick={() => flipAll('v')}
                        data-tip="Flip vertical — mock: real shell persists to spec 09 transform"
                        aria-label="Flip vertical"
                        className="icon-btn boxed icon-btn-sm"
                      >
                        <FlipVertical size={12} strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>
                </Group>
                {allVideo && (
                  <Group title="Speed" onReset={resetSpeed}>
                    <ParamRow
                      label="Rate"
                      {...agg((e) => Math.round((e.speed ?? 1) * 100))}
                      min={10}
                      max={400}
                      unit="%"
                      resetTo={100}
                      onCommit={(v) => setFieldAll({ speed: v / 100 })}
                    />
                    <button
                      type="button"
                      className="mini-btn self-start"
                      aria-pressed={pitchOn}
                      onClick={pitchAll}
                      data-tip="Preserve pitch on retime (spec 06 §5.11) — mock: no ElementJSON field"
                      aria-label="Toggle preserve pitch"
                    >
                      Preserve pitch
                    </button>
                  </Group>
                )}
              </>
            )}

            {/* ---- Audio tab: levels + fades (audio-bearing) ---- */}
            {activeTab === 'audio' && (
              <>
                {!multi && single?.mediaId && <SourceCard el={single} />}
                {/* gain-dB/pan: ElementJSON has no dB/pan fields (spec 03 §9
                    maps them onto the audio graph) — mock-local, honest */}
                <Group title="Levels" onReset={resetLevels}>
                  <ParamRow
                    label="Gain"
                    {...agg((e) => maOf(e.id).gainDb)}
                    min={-48}
                    max={12}
                    step={0.5}
                    unit=" dB"
                    decimals={1}
                    resetTo={DEFAULT_MA.gainDb}
                    onCommit={(v) => setMockAAll({ gainDb: v })}
                  />
                  <ParamRow
                    label="Pan"
                    {...agg((e) => maOf(e.id).pan)}
                    min={-100}
                    max={100}
                    resetTo={DEFAULT_MA.pan}
                    onCommit={(v) => setMockAAll({ pan: v })}
                    title="Pan: -100 = full left · +100 = full right"
                  />
                </Group>
                <Group title="Fades" onReset={resetFades}>
                  <ParamRow
                    label="Fade in"
                    {...agg((e) => e.audioFadeIn ?? 0)}
                    min={0}
                    max={10}
                    step={0.1}
                    unit="s"
                    decimals={2}
                    timeField
                    resetTo={0}
                    onCommit={(v) => setFieldAll({ audioFadeIn: v })}
                  />
                  <ParamRow
                    label="Fade out"
                    {...agg((e) => e.audioFadeOut ?? 0)}
                    min={0}
                    max={10}
                    step={0.1}
                    unit="s"
                    decimals={2}
                    timeField
                    resetTo={0}
                    onCommit={(v) => setFieldAll({ audioFadeOut: v })}
                  />
                </Group>
              </>
            )}

            {/* ---- Effects tab ---- */}
            {activeTab === 'effects' && (
              multi ? (
                <Group title="Effects">
                  <p className="text-[11px] leading-relaxed text-tmuted">
                    {els.length} clips · {els.reduce((n, e) => n + (e.effects?.length ?? 0), 0)} effects total.
                    Effect stacks are per-clip — select a single clip to edit.
                  </p>
                  <p className="text-[11px] leading-relaxed text-tmuted">
                    (mock: single-clip editing; the real shell batches per-clip
                    effect commands, spec 15 §7.)
                  </p>
                </Group>
              ) : (
                <EffectsTab el={els[0]} />
              )
            )}

            {/* ---- Transition tab ---- */}
            {activeTab === 'transition' && <TransitionTab els={els} nextEl={nextEl} />}
          </div>
        )}
      </div>
    </div>
  );
}

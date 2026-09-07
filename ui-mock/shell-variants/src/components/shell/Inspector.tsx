/* InspectorPanel — R20-W3 (DESIGN-R20 D4): TYPE-DRIVEN, no tab strip.
   The 64px 4-tab strip (spec 18 §4.4) is REMOVED per reviewer thread #53 —
   the inspector is ONE scroll of SECTIONS rendered by selected-entity type,
   adopting the inspectorpanel.tsx reference grammar:
   - SectionHeader (Group): compact 26px row = caret expand/collapse (0→90°,
     0.1s) + title + keyframe-slot (honest placeholder — engine round lands
     post-mock) + reset icon (same write path as §5A double-click reset).
   - ControlRow (ParamRow): right-aligned 96px label | control | keyframe
     diamond + per-row reset icon.
   - Compact [Levels | EQ] TEXT sub-tabs live ONLY inside the Audio section
     (long-family rule) and KEEP tablist/tab semantics (spec 18 §11.6).
   18 §4.4/§11.6 deviation registered in README + ledger C58.

   Selection domains (D4.2, store): selectedTrackId / selectedEffectId
   ({clipId, fxId} composite) mirror the R19 selectedMarkerId domain-swap
   law — one domain at a time; the effect domain dies with its clip.
   Sheet table: multi-clip → mixed sheet (commonOf, preserved) | single clip
   → type sections | track → TrackSheet | effect → params expand in place
   (aria-expanded/aria-current on the row) | empty → ACTIVE-TRACK fallback
   KEPT (R19 th_mto5fdf6, the reviewer's feature — now via the SAME
   TrackSheet component) | marker/caption → the R19 rail panels (AppShell).

   Commit semantics (§4.4 "uniform commit semantics", unchanged from R19):
   - NumberField: live preview on keystroke behind a 50ms debounce — one
     store write per settle; Enter and blur settle immediately; invalid
     input = red border + inline message + focus retained, nothing
     dispatched. Time-based fields parse through the ONE shared parser
     (parseTc: "HH:MM:SS:FF" | "SS.s" | "Nf").
   - Sliders: local drag state (live preview), one commit on release.
   - Double-click a field/slider resets it to its spec 09 default (§5A)
     through the same write path as the section Reset — a command, not a
     local re-render.

   Honest mock boundaries (each commented at its site):
   - position/scale/rotation/flip, blend mode, preserve-pitch have NO
     ElementJSON field → component-local state keyed by element id; the
     real shell persists them to spec 09. Not written through
     setElementField because the model has nowhere to put them.
   - Multi-select commits fan out one store write per element; the real
     shell sends one coalesced updateElements batch (spec 15 §7).
   - Effect reorder patches the effects array via setElementField; real
     shell = reorderEffect (spec 15 §4.3.55).
   - R23-WA: removeTransition EXISTS now (DESIGN-R23 D-A3) — the transition
     Remove row is LIVE (the old "no store action" boundary is dead).
   - The minimal Project sheet (D4.4 DESCOPED) is a read-only summary —
     project-level editing lands with C58; the timeline grade is NEVER
     edited here (single owner = ColorConsole).
   - NumberField/ParamRow/Group/LiveText are EXPORTED: the R19 rail panels
     (MarkerInspector/CaptionInspector) reuse the exact same field
     contracts instead of forking them. R23-WA: EffectsSection +
     TransitionSection are exported too — the FX inspector (components/fx/)
     reuses them (one component, two frames — the anti-duplication law). */

import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  AudioWaveform, ChevronDown, ChevronRight, ChevronUp, Diamond, FlipHorizontal, FlipVertical,
  FolderCog, History, Image as ImageIcon, Layers, MoreHorizontal, Plus, RotateCcw, Sparkles, Type, Video, X,
} from 'lucide-react';
import { activeTrackOf, useUi } from '../../state/useUiStore';
import {
  EFFECT_DEFS, TRANSITION_PRESENTATIONS, findElement, mediaById, project, sceneDuration,
  type EffectJSON, type ElementJSON, type SceneJSON, type TrackJSON, type TransitionJSON, type TransitionPresentation,
} from '../../lib/mockData';
import { ROLE_LABEL, type MixerTrackSettings, type Role } from '../../state/mockMixer';
import { clamp, parseTc, tc } from '../../lib/timecode';
/* R23-WA (DESIGN-R23 D-A4): the Edit page embeds the FX page's section form
   while the FX selection domain holds. The import is CYCLIC by design
   (FxInspector imports this file's shared sections) — safe in ESM because
   every cross-binding is a hoisted `export function` referenced only at
   render time, never at module-init time. */
import { FxInspectorSection } from '../fx/FxInspector';

/* ---- shared bits ------------------------------------------------------ */

/* D4.1 section matrix: the transform/composite/speed family belongs to
   video/IMAGE clips; text clips carry Text/Timing instead (the mission's
   section table — the old Video-tab VISUAL set included text, the new
   matrix splits them). */
const SPATIAL: ReadonlySet<ElementJSON['type']> = new Set(['video', 'image']);
const audioBearing = (e: ElementJSON) => e.type === 'audio' || e.type === 'video';

/* spec 09 defaults — drive per-section Reset + §5A double-click reset */
const DEFAULT_MT = { x: 960, y: 540, scale: 100, rot: 0 }; // canvas-center, unflipped
type MockTransform = typeof DEFAULT_MT;

/* R19 audio dB↔linear maps (audio_editor_ui reference) — unchanged.
   spec 09's ElementJSON.volume is a LINEAR gain multiplier (unity 1.0 =
   0 dB); display uses 20·log10, edits write 10^(dB/20). */
const VOL_DB_MIN = -24;
const VOL_DB_MAX = 12;
const volToDb = (v: number) => Math.max(VOL_DB_MIN, v > 1e-5 ? 20 * Math.log10(v) : VOL_DB_MIN);
const dbToVol = (db: number) => 10 ** (db / 20);

/* R19 EQ display: 4 fixed bands, ±24 dB (62/250/1K/4K/16K corners — mockData) */
const EQ_ZERO: [number, number, number, number] = [0, 0, 0, 0];
const EQ_BAND_HZ = ['62', '250', '1K', '4K', '16K'] as const;
const eqOf = (e: ElementJSON): [number, number, number, number] => e.eq ?? EQ_ZERO;
const withBand = (eq: [number, number, number, number], i: number, v: number): [number, number, number, number] =>
  [eq[0], eq[1], eq[2], eq[3]].map((x, bi) => (bi === i ? v : x)) as [number, number, number, number];

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

/** next element on the same track — "a cut follows" (transition visibility).
 *  R23-WA: EXPORTED — the FX inspector's transition mode feeds the shared
 *  TransitionSection and needs the same neighbor law. */
export function nextOnTrack(elements: ElementJSON[], el: ElementJSON): ElementJSON | null {
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

/* ---- NumberField: the §4.4 field contract (unchanged, exported) -------- */

export function NumberField({
  value, min, max, unit = '', decimals = 0, timeField = false, blank = false,
  placeholder, resetTo, ariaLabel, tcDisplay = false, testId, onCommit,
}: {
  value: number;
  min: number;
  max: number;
  unit?: string;
  decimals?: number;
  /** parse through the shared TC parser (time-based fields) */
  timeField?: boolean;
  /** R19: TC-formatted DISPLAY (00:00:08:12) — parsing is unchanged (the
      one shared parseTc grammar); the R19 marker/caption panels show SMPTE */
  tcDisplay?: boolean;
  /** mixed multi-select: render empty until the user types (then it writes all) */
  blank?: boolean;
  placeholder?: string;
  /** spec 09 default for the §5A double-click reset */
  resetTo?: number;
  ariaLabel: string;
  /** R19: the rail panels' data-testid hook (shell-marker/caption-inspector-*) */
  testId?: string;
  onCommit: (v: number) => void;
}) {
  const fmt = (v: number) => (tcDisplay ? tc(v) : `${v.toFixed(decimals)}${unit}`);
  const [text, setText] = useState(() => (blank ? '' : fmt(value)));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const timer = useRef<number | null>(null);
  const commitRef = useRef(onCommit);
  useEffect(() => { commitRef.current = onCommit; });

  // resync the display when the committed value moves underneath us and
  // the user isn't mid-edit (slider release, section reset, undo, selection)
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
    if (v < min || v > max) {
      return { v: null, err: tcDisplay
        ? `Range ${tc(min)}…${tc(max)}`
        : `Range ${min}…${max}${unit}` };
    }
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
        data-testid={testId}
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
          // commit path as the section Reset (undoable write, not a re-render)
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

/* ---- LiveText: the §4.4 commit contract for free-text fields (R19) ------ */

export function LiveText({
  value, onCommit, ariaLabel, textarea = false, className = '', placeholder, testId,
}: {
  value: string;
  onCommit: (v: string) => void;
  ariaLabel: string;
  textarea?: boolean;
  className?: string;
  placeholder?: string;
  testId?: string;
}) {
  const [text, setText] = useState(value);
  const valueRef = useRef(value);
  const focused = useRef(false);
  const timer = useRef<number | null>(null);
  const commitRef = useRef(onCommit);
  useEffect(() => { commitRef.current = onCommit; });
  useEffect(() => {
    valueRef.current = value;
    // resync on external change (undo, marker swap, Add New) while not editing
    if (!focused.current) setText(value);
  }, [value]);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const clearTimer = () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
  };
  const settle = () => {
    clearTimer();
    if (text !== valueRef.current) commitRef.current(text);
  };
  const onChange = (raw: string) => {
    setText(raw);
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (focused.current) commitRef.current(raw);
    }, 50);
  };

  const shared = {
    value: text,
    placeholder,
    'aria-label': ariaLabel,
    'data-testid': testId,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: () => { focused.current = true; },
    onBlur: () => { focused.current = false; settle(); },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !textarea) {
        e.preventDefault();
        settle();
      } else if (e.key === 'Escape') {
        clearTimer();
        setText(valueRef.current);
      }
    },
    className: `field min-w-0 ${className}`,
  };
  return textarea
    ? <textarea {...shared} rows={3} />
    : <input type="text" {...shared} />;
}

/* ---- ParamRow (ControlRow grammar, exported) ----------------------------
   label (right-aligned 96px) | control (slider + NumberField, or the §4.4
   mixed chip) | actions (keyframe diamond + per-row reset icon). The
   keyframe slot is the grammar's placeholder — honest: the engine round
   lands post-mock (aria-hidden decorative). */

export function ParamRow({
  label, value, mixed = false, min, max, step = 1, unit = '', decimals = 0,
  timeField = false, tcDisplay = false, resetTo, title, onCommit,
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
  tcDisplay?: boolean;
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
      <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted" title={title}>{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
          tcDisplay={tcDisplay}
          resetTo={resetTo}
          placeholder={mixed ? '—' : undefined}
          ariaLabel={mixed ? `${label} — mixed values; typing sets all selected` : `${label} value`}
          onCommit={onCommit}
        />
      </div>
      <span className="flex w-[38px] shrink-0 items-center justify-end gap-1.5 pr-0.5">
        {/* keyframe slot — grammar placeholder, honest (engine round post-mock) */}
        <Diamond
          size={8}
          strokeWidth={1.6}
          aria-hidden="true"
          className="shrink-0 text-tfaint"
        />
        {resetTo !== undefined && (
          <button
            type="button"
            onClick={() => { setDrag(null); onCommit(resetTo); }}
            aria-label={`Reset ${label}`}
            data-tip={`Reset to default — ${fmtDefault(resetTo, unit)}`}
            className="shrink-0 text-tmuted hover:text-accent"
          >
            <RotateCcw size={10} strokeWidth={1.7} />
          </button>
        )}
      </span>
    </div>
  );
}

function fmtDefault(v: number, unit: string): string {
  return `${v}${unit}`;
}

/* ---- Group (SectionHeader grammar, exported) ----------------------------
   inspectorpanel.tsx reference anatomy: compact 26px header = caret
   expand/collapse (rotates 0→90° over 0.1s) + title + keyframe-slot +
   reset icon. Body stays in the DOM (hidden attr) so aria-controls keeps
   pointing at a real region. Default stays OPEN. Every section is
   collapsible now (the grammar's law); the toggle slot of the reference
   grammar has no current consumer (no section carries an enable flag) —
   omitted rather than dead. */

export function Group({
  title, children, onReset, note,
}: { title: string; children: ReactNode; onReset?: () => void; note?: string }) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  return (
    <section className="border-b border-hairline">
      <div className="flex h-[26px] min-h-[26px] items-center gap-1.5 border-b border-hairline bg-raised px-2">
        <button
          type="button"
          className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-tmuted hover:text-tprimary"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
          data-testid={`shell-inspector-group-${slug}-caret`}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight
            size={10}
            strokeWidth={1.8}
            className={`transition-transform duration-100 ${open ? 'rotate-90' : ''}`}
          />
        </button>
        <span className="text-[11px] font-medium tracking-wide text-tprimary">{title}</span>
        <div className="grow" />
        {/* keyframe slot — grammar placeholder (see header comment) */}
        <Diamond
          size={8}
          strokeWidth={1.6}
          aria-hidden="true"
          data-tip="Keyframe — the engine round lands post-mock (spec 09 timeline resolver)"
          className="shrink-0 text-tfaint"
        />
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            data-tip="Reset section to spec 09 defaults"
            className="shrink-0 text-tmuted hover:text-accent"
            aria-label={`Reset ${title}`}
          >
            <RotateCcw size={10} strokeWidth={1.7} />
          </button>
        )}
      </div>
      <div id={bodyId} hidden={!open} className="flex flex-col gap-1.5 px-3 py-2">
        {children}
        {note && <p className="text-[10px] leading-[1.4] text-tfaint">{note}</p>}
      </div>
    </section>
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

/* ---- TrackSheet (track domain + the R19 empty-selection fallback) --------
   One component for BOTH: selectedTrackId (D4.2) and the active-track
   fallback (th_mto5fdf6 — the feature the reviewer asked for). Track
   toggles are REAL (toggleTrackCmd); audio tracks surface the mockMixer
   strip (fader/pan/outputBus via setMixerTrack, role label) and the
   track-level FX rack (the 2 insert slots — real writes; the full rack
   home is gap C57). Lane height = the GLOBAL pref (B3 seal: the mock's
   registered answer; per-track overrides land with C57). */

const TRACK_KIND_LABEL: Record<TrackJSON['kind'], string> = {
  overlay: 'Overlay', main: 'Main', audio: 'Audio', caption: 'Caption',
};

/* local default for audio tracks the mixer sidecar hasn't seeded (added after
   boot, before enterAudioFocus) — setMixerTrack merges the same shape in the
   store, so a first write from here lands on a full record */
const FALLBACK_STRIP: MixerTrackSettings = { fader: -6, pan: 0, inserts: [null, null], auxA: 0, auxB: 0, auxPreFader: false, outputBus: 0 };

const TRACK_TOGGLES: { field: 'muted' | 'solo' | 'locked' | 'visible'; label: string }[] = [
  { field: 'muted', label: 'Mute' },
  { field: 'solo', label: 'Solo' },
  { field: 'locked', label: 'Lock' },
  { field: 'visible', label: 'Visible' },
];

function TrackSheet({ scene, track, via }: { scene: SceneJSON; track: TrackJSON; via: 'selected' | 'fallback' }) {
  const toggleTrackCmd = useUi((s) => s.toggleTrackCmd);
  const mixer = useUi((s) => s.mixer);
  const setMixerTrack = useUi((s) => s.setMixerTrack);
  const trackHeightPref = useUi((s) => s.trackHeightPref);
  const setTrackHeightPref = useUi((s) => s.setTrackHeightPref);

  const isAudio = track.kind === 'audio';
  const strip = mixer.tracks[track.id] ?? FALLBACK_STRIP;
  const role = mixer.roles[track.id] as Role | undefined;

  const setInsert = (slot: 0 | 1, v: string | null) =>
    setMixerTrack(track.id, { inserts: slot === 0 ? [v, strip.inserts[1]] : [strip.inserts[0], v] });

  return (
    /* shell-inspector-state-track = the preserved R19 rail testid;
       shell-track-sheet = the D4.2 track-sheet testid root */
    <div data-testid="shell-inspector-state-track" className="flex flex-col">
      <div data-testid="shell-track-sheet" data-via={via} className="flex flex-col">
        {/* hint row — the route back to clip fields (fallback keeps the R19 copy) */}
        <div className="flex items-center gap-2 border-b border-hairline bg-inset px-3 py-1.5" data-testid="shell-track-sheet-hint">
          <span className="text-[11px] text-tmuted">
            {via === 'fallback'
              ? 'Select a clip to edit clip parameters'
              : 'Track selected — click a clip to edit clip parameters'}
          </span>
        </div>

        <Group title="Track">
          <div className="flex items-center gap-2">
            <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Kind</span>
            <span className="text-[11px] text-tprimary">{TRACK_KIND_LABEL[track.kind]}</span>
            <span className="mono ml-auto text-[11px] text-tmuted">{track.elements.length} clips</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* REAL toggles: toggleTrackCmd is withHistory — these are the same
                commands the track headers issue, not display state */}
            {TRACK_TOGGLES.map(({ field, label }) => (
              <button
                key={field}
                type="button"
                className="mini-btn"
                aria-pressed={track[field]}
                aria-label={`Toggle ${label.toLowerCase()} on track ${track.badge}`}
                data-testid={`shell-track-sheet-${field}`}
                data-tip={`${label} — real toggleTrackCmd write (undoable)`}
                onClick={() => toggleTrackCmd(scene.id, track.id, field)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Lane height</span>
            <select
              className="field min-w-0 flex-1 cursor-pointer"
              aria-label={`Lane height for track ${track.badge}`}
              data-testid="shell-track-sheet-height"
              value={trackHeightPref ?? 'auto'}
              onChange={(e) => setTrackHeightPref(e.target.value === 'auto' ? null : e.target.value as 'compact' | 'normal' | 'tall')}
            >
              <option value="auto">Auto</option>
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="tall">Tall</option>
            </select>
          </div>
        </Group>

        {/* track-level FX rack: the G-strip insert slots (REAL setMixerTrack
            writes) — the full per-track FX home is gap C57 */}
        <Group title="Track FX" note="Track-level FX home is gap C57 — these are the G-layer insert slots (spec 20 §4.2).">
          {([0, 1] as const).map((slot) => (
            <div key={slot} className="flex items-center gap-2">
              <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Insert {slot + 1}</span>
              <select
                className="field min-w-0 flex-1 cursor-pointer"
                aria-label={`Insert slot ${slot + 1} on track ${track.badge}`}
                data-testid={`shell-track-sheet-insert-${slot + 1}`}
                value={strip.inserts[slot] ?? ''}
                onChange={(e) => setInsert(slot, e.target.value || null)}
              >
                <option value="">—</option>
                <option value="EQ">EQ</option>
                <option value="Comp">Comp</option>
                <option value="Gate">Gate</option>
                <option value="De-esser">De-esser</option>
              </select>
            </div>
          ))}
        </Group>

        {isAudio && (
          <Group title="Mixer">
            {/* role label — mockMixer client-side tag (spec 09 has no role field) */}
            {role && (
              <div className="flex items-center gap-2">
                <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Role</span>
                <span className="insp-badge">{ROLE_LABEL[role]}</span>
              </div>
            )}
            <ParamRow
              label="Fader"
              value={strip.fader}
              min={-60}
              max={6}
              step={0.5}
              unit=" dB"
              decimals={1}
              resetTo={0}
              title="Track fader (G-layer strip, spec 20 §4.2) — real setMixerTrack write"
              onCommit={(v) => setMixerTrack(track.id, { fader: v })}
            />
            <ParamRow
              label="Pan"
              value={strip.pan}
              min={-100}
              max={100}
              resetTo={0}
              title="Track pan: −100 = full left · +100 = full right — real setMixerTrack write"
              onCommit={(v) => setMixerTrack(track.id, { pan: v })}
            />
            <div className="flex items-center gap-2">
              <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Output</span>
              <select
                className="field min-w-0 flex-1 cursor-pointer"
                aria-label={`Output bus on track ${track.badge}`}
                data-testid="shell-track-sheet-output"
                value={strip.outputBus}
                onChange={(e) => setMixerTrack(track.id, { outputBus: Number(e.target.value) as 0 | 1 | 2 })}
              >
                <option value={0}>Master</option>
                <option value={1}>A1 {mixer.buses.a1.name}</option>
                <option value={2}>A2 {mixer.buses.a2.name}</option>
              </select>
            </div>
          </Group>
        )}
      </div>
    </div>
  );
}

/* header law: "Track — {badge} {name}" (deduped when badge === name — every
   scene-1 lane is badge-eponymous: V1/A1/…); lives in the caller so the panel
   header + the sheet agree without prop drilling the title */
export function trackSheetTitle(track: TrackJSON): string {
  return track.badge === track.name ? `Track — ${track.badge}` : `Track — ${track.badge} ${track.name}`;
}

/* ---- effect param rows (the per-effect editor, reused verbatim) --------- */

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

/* ---- Effects section (single selection) ---------------------------------
   R20-W3 D4.2: each effect row is CLICKABLE — selecting the effect swaps the
   entity chip (breadcrumb: track > clip > effect) and its params expand IN
   PLACE (accordion; the row carries aria-expanded + aria-current). The
   enabled toggle / reorder / remove actions ride the row header as before.
   R23-WA: EXPORTED — the FX inspector's clip mode reuses this exact section
   (D-A4/#105 "selecting the clip itself will just inspect Effects"). */

export function EffectsSection({ el, selectedFxId }: { el: ElementJSON; selectedFxId: string | null }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggleEffect = useUi((s) => s.toggleEffect);
  const removeEffect = useUi((s) => s.removeEffect);
  const addEffectToElement = useUi((s) => s.addEffectToElement);
  const selectEffect = useUi((s) => s.selectEffect);
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
        const expanded = selectedFxId === fx.id;
        return (
          <div key={fx.id} className="rounded-[var(--radius)] border border-soft">
            <div className="flex items-center gap-1 border-b border-hairline px-2 py-1">
              {/* the clickable row — D4.2: selecting the effect expands its
                  params in place (accordion law, aria-expanded/aria-current) */}
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[var(--radius-sm)] py-[1px] text-left hover:text-tprimary"
                aria-expanded={expanded}
                aria-current={expanded ? 'true' : undefined}
                data-testid={`shell-effect-row-${fx.id}`}
                data-tip="Select the effect — its params expand in place (D4.2)"
                aria-label={`Select effect ${fx.name}`}
                onClick={() => selectEffect(el.id, expanded ? null : fx.id)}
              >
                <ChevronRight
                  size={10}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className={`shrink-0 text-tmuted transition-transform duration-100 ${expanded ? 'rotate-90' : ''}`}
                />
                <span className={`min-w-0 truncate text-[11.5px] ${fx.enabled ? (expanded ? 'text-tprimary' : 'text-tprimary') : 'text-tmuted'}`}>{fx.name}</span>
              </button>
              <span className="shrink-0 text-[11px] text-tmuted">{fx.enabled ? 'on' : 'off'}</span>
              <input
                type="checkbox"
                checked={fx.enabled}
                onChange={() => toggleEffect(el.id, fx.id)}
                aria-label={`Enable ${fx.name}`}
                className="shrink-0 accent-[var(--accent-focus)]"
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
            {/* the EffectEditor: the selected effect's params, in place */}
            {expanded && def && def.params.length > 0 && (
              <div
                data-testid={`shell-effect-editor-${fx.id}`}
                className={`flex flex-col gap-2 px-2 py-1.5 ${fx.enabled ? '' : 'opacity-55'}`}
              >
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

/* ---- Transition section -------------------------------------------------
   R23-WA: EXPORTED (the FX inspector's transition mode reuses it verbatim —
   one component, two frames); the Remove row is LIVE via the store's new
   removeTransition (delete-aware + clears the pointing FX selection). */

export function TransitionSection({ els, nextEl }: { els: ElementJSON[]; nextEl: ElementJSON | null }) {
  const setTransition = useUi((s) => s.setTransition);
  const removeTransition = useUi((s) => s.removeTransition);
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
        <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Presentation</span>
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
        {/* R23-WA (DESIGN-R23 D-A3): LIVE — removeTransition is a real store
            action now (delete-aware + history + clears the pointing FX
            selection); the old disabled row's "mock: removal needs store
            action" reason died with the action. The removal writes every
            selected element that carries one (the fan-out law). */}
        <button
          type="button"
          className="mini-btn"
          aria-label="Remove transition"
          onClick={() => els.forEach((el) => el.transitionOut && removeTransition(el.id))}
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

/* ---- R19 Clip Equalizer bands (unchanged) -------------------------------- */

function EqBand({ els, i }: { els: ElementJSON[]; i: number }) {
  const setElementField = useUi((s) => s.setElementField);
  const [drag, setDrag] = useState<number | null>(null);
  const committed = commonOf(els.map((e) => eqOf(e)[i]));
  const shown = drag ?? committed.value;
  /* reference axis law: 5 corner labels (62/250/1K/4K/16K) over 4 editable
     points — band i spans corner i → i+1 */
  const range = `${EQ_BAND_HZ[i]}–${EQ_BAND_HZ[i + 1]}`;
  /** write ONLY band i, preserving each element's other bands */
  const writeBand = (v: number) => els.forEach((e) => setElementField(e.id, { eq: withBand(eqOf(e), i, clamp(Math.round(v), -24, 24)) }));
  return (
    <div className="flex w-[48px] shrink-0 flex-col items-center gap-1" data-testid={`shell-inspector-eq-band-${i + 1}`}>
      <span className="insp-badge" data-testid={`shell-inspector-eq-value-${i + 1}`}>
        {shown > 0 ? '+' : ''}{Math.round(shown)}
      </span>
      {committed.mixed ? (
        /* §4.4 mixed multi-select: values differ — slider hides, reset writes all */
        <span className="chip-mixed" data-testid="chip-mixed-values">Mixed</span>
      ) : (
        <input
          type="range"
          min={-24}
          max={24}
          step={1}
          value={shown}
          aria-label={`Clip equalizer band ${i + 1} (${range} Hz) gain`}
          data-testid={`shell-inspector-eq-slider-${i + 1}`}
          /* vertical slider — writing-mode per the CSS range spec; jsdom
             ignores it, browsers render the reference's vertical bands */
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          className="h-[88px]"
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={() => { if (drag !== null) { writeBand(drag); setDrag(null); } }}
          onPointerCancel={() => setDrag(null)}
          onKeyUp={() => { if (drag !== null) { writeBand(drag); setDrag(null); } }}
          onDoubleClick={() => { setDrag(null); writeBand(0); }}
        />
      )}
      <button
        type="button"
        className="mini-btn"
        aria-label={`Reset EQ band ${i + 1} (${range})`}
        data-testid={`shell-inspector-eq-reset-${i + 1}`}
        data-tip="Reset this band to 0 dB (all selected clips)"
        onClick={() => { setDrag(null); writeBand(0); }}
      >
        0
      </button>
    </div>
  );
}

/* ---- Audio section (audio-bearing clips) ---------------------------------
   The ONLY place compact text sub-tabs survive (long-family rule): the
   reference's [Levels | EQ] pair. tablist/tab semantics KEPT (spec 18
   §11.6). Sub-tab state is LOCAL (the store's inspectorTab surface is gone).
   Levels = Clip Volume / Pan / Pitch / Fades (all REAL store writes);
   EQ = the 4-band equalizer. */

function AudioSection({
  els, agg, setFieldAll,
}: {
  els: ElementJSON[];
  agg: <T>(get: (e: ElementJSON) => T) => { mixed: boolean; value: T };
  setFieldAll: (patch: Partial<ElementJSON>) => void;
}) {
  const [sub, setSub] = useState<'levels' | 'eq'>('levels');
  return (
    <section className="border-b border-hairline">
      <div className="flex h-[26px] min-h-[26px] items-center gap-1.5 border-b border-hairline bg-raised px-2">
        <span className="text-[11px] font-medium tracking-wide text-tprimary">Audio</span>
        <div className="grow" />
        {/* compact text sub-tabs — spec 18 §11.6 tablist semantics KEPT */}
        <div role="tablist" aria-label="Audio sections" className="flex items-center gap-0.5">
          <button
            type="button"
            role="tab"
            id="tab-audio-levels"
            aria-selected={sub === 'levels'}
            aria-controls="insp-audio-levels"
            data-testid="shell-inspector-subtab-levels"
            onClick={() => setSub('levels')}
            className={`rounded-[var(--radius-sm)] px-2 py-[1px] text-[10.5px] ${sub === 'levels' ? 'bg-[var(--active-overlay)] text-tprimary' : 'text-tmuted hover:text-tprimary'}`}
          >
            Levels
          </button>
          <button
            type="button"
            role="tab"
            id="tab-audio-eq"
            aria-selected={sub === 'eq'}
            aria-controls="insp-audio-eq"
            data-testid="shell-inspector-subtab-eq"
            onClick={() => setSub('eq')}
            className={`rounded-[var(--radius-sm)] px-2 py-[1px] text-[10.5px] ${sub === 'eq' ? 'bg-[var(--active-overlay)] text-tprimary' : 'text-tmuted hover:text-tprimary'}`}
          >
            EQ
          </button>
        </div>
      </div>
      <div
        id="insp-audio-levels"
        role="tabpanel"
        aria-labelledby="tab-audio-levels"
        hidden={sub !== 'levels'}
        className="flex flex-col"
      >
        <Group title="Clip Volume" onReset={() => setFieldAll({ volume: 1 })}>
          {/* dB display + dB→linear write (see volToDb/dbToVol header
              comment: spec 09 volume is a linear multiplier) */}
          <ParamRow
            label="Volume"
            {...agg((e) => volToDb(e.volume ?? 1))}
            min={VOL_DB_MIN}
            max={VOL_DB_MAX}
            step={0.5}
            unit=" dB"
            decimals={1}
            resetTo={0}
            title="Clip volume in dB (reference range −24..+12) — writes the linear ElementJSON.volume"
            onCommit={(v) => setFieldAll({ volume: dbToVol(v) })}
          />
        </Group>
        <Group title="Clip Pan" onReset={() => setFieldAll({ pan: 0 })}>
          <ParamRow
            label="Pan"
            {...agg((e) => e.pan ?? 0)}
            min={-1}
            max={1}
            step={0.05}
            decimals={2}
            resetTo={0}
            title="Clip pan: −1 = full left · +1 = full right (per-clip, gap C35)"
            onCommit={(v) => setFieldAll({ pan: clamp(v, -1, 1) })}
          />
        </Group>
        <Group title="Clip Pitch" onReset={() => setFieldAll({ pitchSemitones: 0, pitchCents: 0 })}>
          <ParamRow
            label="Semi Tones"
            {...agg((e) => e.pitchSemitones ?? 0)}
            min={-12}
            max={12}
            resetTo={0}
            title="Pitch shift in semitones (per-clip, gap C35)"
            onCommit={(v) => setFieldAll({ pitchSemitones: clamp(Math.round(v), -12, 12) })}
          />
          <ParamRow
            label="Cents"
            {...agg((e) => e.pitchCents ?? 0)}
            min={-100}
            max={100}
            resetTo={0}
            title="Pitch fine-tune in cents (per-clip, gap C35)"
            onCommit={(v) => setFieldAll({ pitchCents: clamp(Math.round(v), -100, 100) })}
          />
        </Group>
        <Group title="Fades" onReset={() => setFieldAll({ audioFadeIn: 0, audioFadeOut: 0 })}>
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
      </div>
      <div
        id="insp-audio-eq"
        role="tabpanel"
        aria-labelledby="tab-audio-eq"
        hidden={sub !== 'eq'}
        className="flex flex-col"
      >
        <Group title="Clip Equalizer" onReset={() => setFieldAll({ eq: [0, 0, 0, 0] })}>
          {/* 4 vertical band sliders — the reference's EQ graph
              condensed to the honest editable bands */}
          <div className="flex items-start justify-between px-1 pt-1" data-testid="shell-inspector-eq">
            {[0, 1, 2, 3].map((i) => <EqBand key={i} els={els} i={i} />)}
          </div>
          {/* frequency axis — 5 corner labels over the 4 points
              (62 / 250 / 1K / 4K / 16K, the reference's justify-between axis) */}
          <div className="flex justify-between px-1 pt-0.5" aria-hidden="true">
            {EQ_BAND_HZ.map((hz) => <span key={hz} className="mono text-[10px] text-tmuted">{hz}</span>)}
          </div>
          <p className="text-[10px] leading-[1.4] text-tfaint">
            Bands 62–250 · 250–1K · 1K–4K · 4K–16K Hz, ±24 dB — per-band reset + double-click; the section Reset zeroes all four.
          </p>
        </Group>
      </div>
    </section>
  );
}

/* ---- Text section (text clips: content / language / CPS) ----------------- */

function TextSection({ els, tracks }: { els: ElementJSON[]; tracks: TrackJSON[] }) {
  const setElementField = useUi((s) => s.setElementField);
  const single = els.length === 1 ? els[0] : null;
  const lang = commonOf(tracks.map((t) => t.language ?? '—'));
  const cps = commonOf(els.map((e) => (e.duration > 0 ? (e.text ?? '').length / e.duration : 0)));
  return (
    <Group title="Text">
      {single ? (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-tmuted">Content</span>
          <LiveText
            value={single.text ?? ''}
            textarea
            ariaLabel="Text content"
            testId="shell-inspector-text-content"
            onCommit={(v) => setElementField(single.id, { text: v })}
          />
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-tmuted">
          {els.length} text clips — content edits are single-clip (select one).
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Language</span>
        <span className="text-[11px] text-tprimary">{lang.mixed ? 'Mixed' : (lang.value ?? '—').toUpperCase()}</span>
        <span className="text-[10px] text-tfaint" data-tip="mock: language is the caption-track tag (gap C34) — no per-clip field">track tag</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">CPS</span>
        <span className="mono text-[11px] text-tprimary" data-testid="shell-inspector-text-cps">
          {cps.mixed ? 'Mixed' : `${cps.value.toFixed(1)} cps`}
        </span>
        <span className="text-[10px] text-tfaint">characters / second (derived)</span>
      </div>
    </Group>
  );
}

/* ---- Timing section (text clips: In / Duration via the REAL commands) ----- */

function TimingSection({ el, scene }: { el: ElementJSON; scene: SceneJSON }) {
  const moveElement = useUi((s) => s.moveElement);
  const trimElement = useUi((s) => s.trimElement);
  const durMax = Math.max(sceneDuration(scene), el.duration);
  return (
    <Group
      title="Timing"
      note="Edits route through the REAL move/trim commands (frame-snap + neighbor/source-extent laws, spec 06 §5) — a rejected overlap reverts on the next external resync."
    >
      <div className="flex items-center gap-2">
        <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">In</span>
        <NumberField
          value={el.startTime}
          min={0}
          max={durMax}
          timeField
          tcDisplay
          resetTo={el.startTime}
          ariaLabel="Clip start"
          testId="shell-inspector-timing-in"
          onCommit={(v) => moveElement(el.id, v)}
        />
        <span className="text-[10px] text-tfaint">moveElement (overlap laws)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Duration</span>
        <NumberField
          value={el.duration}
          min={1 / 24}
          max={durMax}
          timeField
          tcDisplay
          resetTo={el.duration}
          ariaLabel="Clip duration"
          testId="shell-inspector-timing-duration"
          onCommit={(v) => trimElement(el.id, 'r', el.startTime, v)}
        />
        <span className="text-[10px] text-tfaint">trimElement right edge</span>
      </div>
    </Group>
  );
}

/* ---- Composite section (visual clips: opacity + blend) -------------------- */

const BLEND_MODES = ['Normal', 'Add', 'Subtract', 'Multiply', 'Screen', 'Overlay', 'Darken', 'Lighten'] as const;

/* ---- Project sheet (D4.4 DESCOPED — read-only summary) -------------------- */

function ProjectSheet() {
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const snap = useUi((s) => s.snap);
  const masterMuted = useUi((s) => s.masterMuted);
  const masterVolume = useUi((s) => s.masterVolume);
  const scene = scenes.find((x) => x.id === activeSceneId) ?? scenes[0];
  /* mockData's project record is the doc (imported, static) — the read-only
     summary reads it directly; the mutable view-state rows come from the store */
  return (
    <div data-testid="shell-inspector-project" className="flex flex-col">
      <Group title="Project">
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Name</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-tprimary">{project.metadata.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Timeline</span>
          <span className="text-[11px] text-tprimary">{scene?.name ?? '—'}</span>
          <span className="mono ml-auto text-[11px] text-tmuted">{scene ? tc(sceneDuration(scene)) : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">FPS</span>
          <span className="mono text-[11px] text-tprimary">{project.settings.fps}</span>
          <span className="mono ml-auto text-[11px] text-tmuted">{project.settings.width}×{project.settings.height}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Audio</span>
          <span className="mono text-[11px] text-tprimary">{project.settings.sampleRate / 1000} kHz · {project.settings.channels}ch</span>
        </div>
      </Group>
      <Group title="Master bus">
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Master</span>
          <span className="mono text-[11px] text-tprimary">{Math.round(masterVolume * 100)}%</span>
          <span className="text-[11px] text-tmuted">{masterMuted ? 'muted' : 'live'}</span>
        </div>
        <p className="text-[10px] leading-[1.4] text-tfaint">
          The mixer's master strip owns the write path (fader/mute via the dock) — this sheet only reads it.
        </p>
      </Group>
      <Group title="Preferences">
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Snap</span>
          <span className="text-[11px] text-tprimary">{snap ? 'on' : 'off'}</span>
          <span className="text-[10px] text-tfaint">toggle lives in the timeline toolbar</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Ripple</span>
          <span className="text-[11px] text-tprimary">per-command</span>
          <span className="text-[10px] text-tfaint">⇧⌫ ripple-delete · ripple trim (no global pref in the mock)</span>
        </div>
      </Group>
      <div className="px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-tmuted" data-testid="shell-inspector-project-note">
          Project-level editing lands with C58 (gap ledger) — this sheet is a read-only summary by design (D4.4 descoped). The timeline grade is edited ONLY in the ColorConsole.
        </p>
      </div>
    </div>
  );
}

/* ---- the entity chip (D4.3) ----------------------------------------------- */

function EntityChip({
  icon: Icon, color, name, typeLabel, entity,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  name: string;
  typeLabel: string;
  entity: string;
}) {
  return (
    <div
      data-testid="inspector-entity-chip"
      data-entity={entity}
      className="flex min-h-[32px] items-center gap-2 border-b border-hairline px-3 py-1"
    >
      <span
        aria-hidden="true"
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border"
        style={{ borderColor: color, color }}
      >
        <Icon size={13} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-tprimary" data-testid="inspector-entity-name">{name}</span>
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.06em] text-tfaint" data-testid="inspector-entity-type">{typeLabel}</span>
    </div>
  );
}

/* kind colors for the chip — the same tokens the timeline lanes use */
const TYPE_COLOR: Record<ElementJSON['type'], string> = {
  video: 'var(--type-video)', image: 'var(--type-video)', text: 'var(--type-overlay)', audio: 'var(--type-audio)',
};
const TYPE_ICON: Record<ElementJSON['type'], ComponentType<{ size?: number; strokeWidth?: number }>> = {
  video: Video, image: ImageIcon, text: Type, audio: AudioWaveform,
};
const TRACK_COLOR: Record<TrackJSON['kind'], string> = {
  main: 'var(--type-video)', overlay: 'var(--type-overlay)', audio: 'var(--type-audio)', caption: 'var(--type-caption, #c1b59c)',
};

/* ---- the panel ----------------------------------------------------------- */

export function Inspector() {
  const selection = useUi((s) => s.selection);
  const scenes = useUi((s) => s.scenes);
  const activeSceneId = useUi((s) => s.activeSceneId);
  const focusedTrackId = useUi((s) => s.focusedTrackId);
  const playhead = useUi((s) => s.playhead);
  const selectedTrackId = useUi((s) => s.selectedTrackId);
  const selectedEffectId = useUi((s) => s.selectedEffectId);
  const selectedEffectClipId = useUi((s) => s.selectedEffectClipId);
  /* R23-WA (D-A4): the FX domain — when it holds, the body's FIRST section is
     the FX editor (the FX page rail's own section form; the clip's sections
     keep rendering below — the fade-object press selects clip AND object). */
  const selectedFxObject = useUi((s) => s.selectedFxObject);
  const inspectorProjectMode = useUi((s) => s.inspectorProjectMode);
  const setElementField = useUi((s) => s.setElementField);
  const pushToast = useUi((s) => s.pushToast);

  /* mock-only model extensions (see header): transform position/scale/
     rotation + flips + blend, preserve-pitch. Keyed by element id — survive
     selection changes, reset on reload. The real shell persists these to
     spec 09 via updateElements. */
  const [mockT, setMockT] = useState<Record<string, MockTransform>>({});
  const [flips, setFlips] = useState<ReadonlySet<string>>(() => new Set()); // `${id}:h` | `${id}:v`
  const [pitch, setPitch] = useState<Record<string, boolean>>({});
  const [blend, setBlend] = useState<Record<string, string>>({}); // mock-local blend mode

  const found = selection
    .map((id) => findElement(scenes, id))
    .filter((f): f is NonNullable<ReturnType<typeof findElement>> => f !== null);
  const els = found.map((f) => f.element);
  const multi = els.length > 1;
  const single = els.length === 1 ? els[0] : null;
  const singleTrack = found.length === 1 ? found[0].track : null;
  const nextEl = found.length === 1 ? nextOnTrack(found[0].track.elements, found[0].element) : null;

  /* th_mto5fdf6: the empty-selection fallback track (derivation law lives in
     the store helper — focused ↑/↓ track, playhead's topmost visual track,
     first main, first track) */
  const scene = scenes.find((x) => x.id === activeSceneId) ?? scenes[0];
  const fallbackTrack = els.length === 0 && scene ? activeTrackOf(scene, focusedTrackId, playhead) : null;
  /* D4.2: the explicit track domain — selectedTrackId (mutually exclusive
     with the clip selection by the store laws) */
  const selectedTrack = scene && selectedTrackId ? scene.tracks.find((t) => t.id === selectedTrackId) ?? null : null;

  /* the effect domain resolves ONLY while its clip is the single selection
     and the fx still exists (removeEffect clears it in-store; this guard is
     the belt-and-braces for stale ids) */
  const activeFx = single && selectedEffectId && selectedEffectClipId === single.id
    ? single.effects?.find((f) => f.id === selectedEffectId) ?? null
    : null;

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
  const setMockTAll = (patch: Partial<MockTransform>) => setMockT((prev) => {
    const next = { ...prev };
    for (const e of els) next[e.id] = { ...(prev[e.id] ?? DEFAULT_MT), ...patch };
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
  const blendAll = (v: string) => setBlend((prev) => {
    const next = { ...prev };
    for (const e of els) next[e.id] = v;
    return next;
  });

  /* per-section reset (§4.4): model-backed fields go through the store (a
     real, undoable write); mock-local fields drop back to their defaults */
  const resetTransform = () => {
    setFieldAll({ opacity: 1 });
    setMockT((prev) => { const n = { ...prev }; for (const e of els) delete n[e.id]; return n; });
    setFlips((prev) => {
      const n = new Set(prev);
      for (const e of els) { n.delete(`${e.id}:h`); n.delete(`${e.id}:v`); }
      return n;
    });
    setBlend((prev) => { const n = { ...prev }; for (const e of els) delete n[e.id]; return n; });
  };
  const resetSpeed = () => {
    setFieldAll({ speed: 1 });
    setPitch((prev) => { const n = { ...prev }; for (const e of els) delete n[e.id]; return n; });
  };

  const allVideo = els.length > 0 && els.every((e) => e.type === 'video' || e.type === 'image');
  const flipH = els.length > 0 && els.every((e) => flips.has(`${e.id}:h`));
  const flipV = els.length > 0 && els.every((e) => flips.has(`${e.id}:v`));
  const pitchOn = els.length > 0 && els.every((e) => pitch[e.id] === true);

  /* section applicability — the type-driven matrix (hidden-not-visible, the
     §4.4 tab law carried over to sections; a section a type can't carry is
     absent, not disabled) */
  const showTransform = els.length > 0 && els.every((e) => SPATIAL.has(e.type));
  const showText = els.length > 0 && els.every((e) => e.type === 'text');
  const showSpeed = allVideo;
  const showAudio = els.length > 0 && els.every(audioBearing);
  const showEffects = els.length > 0;
  const showTiming = showText && !!single && !!scene;
  const showTransition = els.length > 0 && (
    multi
      ? els.every((e) => e.transitionOut != null) // common-subset rule
      : !!(single?.transitionOut || nextEl)
  );
  const showBlend = showTransform; // composite section rides the spatial law

  /* the entity the chip represents (priority: project > track > effect >
     multi > clip > fallback-track > empty) */
  const chip = inspectorProjectMode
    ? { entity: 'project', icon: FolderCog as ComponentType<{ size?: number; strokeWidth?: number }>, color: 'var(--text-muted)', name: 'Project', typeLabel: 'read-only' }
    : selectedTrack
      ? { entity: 'track', icon: Layers as ComponentType<{ size?: number; strokeWidth?: number }>, color: TRACK_COLOR[selectedTrack.kind], name: trackSheetTitle(selectedTrack), typeLabel: TRACK_KIND_LABEL[selectedTrack.kind] }
      : activeFx && singleTrack
        ? { entity: 'effect', icon: Sparkles as ComponentType<{ size?: number; strokeWidth?: number }>, color: 'var(--accent-selection)', name: activeFx.name, typeLabel: 'effect' }
        : multi
          ? { entity: 'multi', icon: Layers as ComponentType<{ size?: number; strokeWidth?: number }>, color: 'var(--text-muted)', name: `${els.length} clips selected`, typeLabel: 'multi-select' }
          : single
            ? { entity: 'clip', icon: TYPE_ICON[single.type], color: TYPE_COLOR[single.type], name: single.name, typeLabel: single.type }
            : fallbackTrack
              ? { entity: 'track', icon: Layers as ComponentType<{ size?: number; strokeWidth?: number }>, color: TRACK_COLOR[fallbackTrack.kind], name: trackSheetTitle(fallbackTrack), typeLabel: `${TRACK_KIND_LABEL[fallbackTrack.kind]} · active` }
              : { entity: 'empty', icon: Layers as ComponentType<{ size?: number; strokeWidth?: number }>, color: 'var(--text-muted)', name: 'Nothing to inspect', typeLabel: 'empty' };

  return (
    <div data-testid="shell-inspector" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      {/* inspector toolbar — actions only (chrome trimmed per review) */}
      <div className="flex items-center gap-1.5 border-b border-hairline px-3" style={{ height: 28, minHeight: 28 }}>
        <button
          className="icon-btn icon-btn-sm"
          data-tip="Inspector history"
          aria-label="Inspector history"
          /* honest mock: the per-field history panel isn't built; the global
             ⌘Z/⇧⌘Z undo IS live — the toast routes users to it (R14 no-op fix) */
          onClick={() => pushToast({ kind: 'info', title: 'History', detail: 'panel not built in the mock — ⌘Z / ⇧⌘Z work (cheat sheet, spec 16 §3.10)' })}
        >
          <History size={12} strokeWidth={1.7} />
        </button>
        <div className="grow" />
        <button
          className="icon-btn icon-btn-sm"
          data-tip="More"
          aria-label="More inspector actions"
          /* honest mock: nothing is hidden behind this button — say so */
          onClick={() => pushToast({ kind: 'info', title: 'More inspector actions', detail: 'the inspector surface is complete for the mock (spec 18 §4.4)' })}
        >
          <MoreHorizontal size={13} strokeWidth={1.7} />
        </button>
      </div>

      {/* D4.3: entity chip — kind-colored icon + name + type label; the tab
          strip is GONE (R20-W3, thread #53) */}
      <EntityChip icon={chip.icon} color={chip.color} name={chip.name} typeLabel={chip.typeLabel} entity={chip.entity} />

      {/* breadcrumb when nested (track > clip > effect) */}
      {activeFx && single && singleTrack && (
        <div
          data-testid="inspector-breadcrumb"
          className="flex items-center gap-1 border-b border-hairline px-3 py-1 text-[10.5px] text-tmuted"
        >
          <span className="mono shrink-0">{singleTrack.badge}</span>
          <span className="min-w-0 truncate">{single.name}</span>
          <ChevronRight size={9} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-tfaint" />
          <span className="min-w-0 shrink-0 truncate text-tprimary">{activeFx.name}</span>
        </div>
      )}

      {/* content — ONE scroll of sections, keyed by selection so fields
          resync on selection change (D4.1) */}
      <div className="scroll-y min-h-0 flex-1" data-testid="shell-inspector-body">
        {inspectorProjectMode ? (
          <ProjectSheet />
        ) : selectedTrack && scene ? (
          <TrackSheet scene={scene} track={selectedTrack} via="selected" />
        ) : els.length === 0 && !selectedFxObject ? (
          /* ACTIVE-TRACK fallback (th_mto5fdf6): the R19 feature, now via the
             SAME TrackSheet component the track domain uses. R23-WA: an FX
             object with no clip selection OWNS the body (the transition-box
             click never selects a clip) — the FX editor below is the content,
             not a track sheet. */
          scene && fallbackTrack ? <TrackSheet scene={scene} track={fallbackTrack} via="fallback" /> : (
            <div className="flex h-full items-center justify-center text-[13px] text-tmuted" data-testid="shell-inspector-state-empty">
              Nothing to inspect
            </div>
          )
        ) : (
          <div key={els.map((e) => e.id).join('·')} className="flex flex-col">
            {/* R23-WA (D-A4): the FX editor rides FIRST while the FX domain
                holds — one component, two frames (the FX page's rail mounts
                the same FxInspectorSection; ColorInspector/ColorInspectorRail
                duplication is the law this clone avoids). */}
            {selectedFxObject && <FxInspectorSection />}
            {/* ---- source card (single, media-bearing) ---- */}
            {!multi && single?.mediaId && <SourceCard el={single} />}

            {/* ---- Transform (visual elements) ---- */}
            {showTransform && (
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
                <div className="flex items-center gap-2">
                  <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Flip</span>
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
            )}

            {/* ---- Composite (visual elements: opacity + blend) ---- */}
            {showBlend && (
              <Group title="Composite" onReset={() => setFieldAll({ opacity: 1 })}>
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
                  <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Blend</span>
                  <select
                    className="field min-w-0 flex-1 cursor-pointer"
                    aria-label="Blend mode"
                    data-testid="shell-inspector-blend"
                    /* mock: ElementJSON has no blend field — local state keyed
                        by id (same honesty law as flips) */
                    value={single ? (blend[single.id] ?? 'Normal') : (els.every((e) => (blend[e.id] ?? 'Normal') === (blend[els[0].id] ?? 'Normal')) ? (blend[els[0].id] ?? 'Normal') : '__mixed__')}
                    onChange={(e) => blendAll(e.target.value === '__mixed__' ? 'Normal' : e.target.value)}
                  >
                    <option value="__mixed__" disabled>Mixed values</option>
                    {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </Group>
            )}

            {/* ---- Speed Change (video: rate + preserve pitch + duration) ---- */}
            {showSpeed && (
              <Group title="Speed Change" onReset={resetSpeed}>
                <ParamRow
                  label="Rate"
                  {...agg((e) => Math.round((e.speed ?? 1) * 100))}
                  min={10}
                  max={400}
                  unit="%"
                  resetTo={100}
                  onCommit={(v) => setFieldAll({ speed: v / 100 })}
                />
                {/* duration readout — derived from the model (not editable
                    here: retime rides the stretch gesture / rate write) */}
                <div className="flex items-center gap-2">
                  <span className="w-[96px] shrink-0 text-right text-[11px] text-tmuted">Duration</span>
                  <span className="mono text-[11px] text-tprimary" data-testid="shell-inspector-speed-duration">
                    {agg((e) => e.duration).mixed ? 'Mixed' : tc(agg((e) => e.duration).value)}
                  </span>
                  <span className="text-[10px] text-tfaint">timeline span</span>
                </div>
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

            {/* ---- Text (text clips: content/language/CPS) ---- */}
            {showText && (
              <TextSection els={els} tracks={found.map((f) => f.track)} />
            )}

            {/* ---- Timing (text clips: In/Duration via real commands) ---- */}
            {showTiming && single && scene && (
              <TimingSection el={single} scene={scene} />
            )}

            {/* ---- Audio (audio-bearing: [Levels | EQ] sub-tabs) ---- */}
            {showAudio && (
              <AudioSection els={els} agg={agg} setFieldAll={setFieldAll} />
            )}

            {/* ---- Effects (stack; rows clickable → params in place) ---- */}
            {showEffects && (
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
                <EffectsSection el={els[0]} selectedFxId={activeFx?.id ?? null} />
              )
            )}

            {/* ---- Transition (when present / a cut follows) ---- */}
            {showTransition && <TransitionSection els={els} nextEl={nextEl} />}
          </div>
        )}
      </div>
    </div>
  );
}

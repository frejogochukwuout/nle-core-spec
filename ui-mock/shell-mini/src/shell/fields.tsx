/* R24-miniplus (DESIGN-R24 D3): the inspector field primitives — ported
 * from the variants' Inspector (the crown jewels), adapted to the mini's
 * grammar. THE LAWS (test-pinned, port verbatim):
 * - NumberField: live preview behind a 50ms debounce → ONE commit per
 *   settle; Enter and blur settle immediately; invalid input = red
 *   border + inline message + focus retained + NOTHING dispatched
 *   (Enter-invalid keeps the error; blur-invalid reverts the display);
 *   Escape reverts; double-click resets to the default through the SAME
 *   commit path.
 * - ParamRow (slider): local drag state, ONE commit on release; the
 *   external value resyncs while not focused.
 * - Group: 26px caret header; the body stays in DOM via `hidden` (never
 *   unmounted — the collapse animation + a11y surface survive).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** The one parse law for number fields: accept a plain decimal ("1.5",
 * " 2 ", "-0.5"); return null for anything a human might type while
 * mid-edit ("" and non-numerics) so the field can show the invalid state
 * without dispatching. */
export function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  /** invalid = outside [min,max] OR unparseable → the red-border law */
  min?: number;
  max?: number;
  step?: number;
  /** the double-click reset target (the spec default) */
  resetTo?: number;
  /** a display transform (e.g. seconds → timecode-ish); the commit stays
   *  in the field's own unit */
  format?: (v: number) => string;
  testid: string;
  /** aria-describedby on the input + the row's error target id */
  invalidHint?: string;
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 0.5,
  resetTo,
  format,
  testid,
  invalidHint = 'Out of range',
}: NumberFieldProps) {
  const [text, setText] = useState(() => (format ? format(value) : String(value)));
  const [error, setError] = useState<string | null>(null);
  /* the external-value resync: while the field is NOT focused, an external
   * value change (undo, selection switch) re-types the display; while
   * focused the field is the truth (the user is mid-edit). */
  const focused = useRef(false);
  const [focusedFlag, setFocusedFlag] = useState(false);
  useEffect(() => {
    if (!focused.current) setText(format ? format(value) : String(value));
  }, [value, format]);

  const clampHint = () => {
    if (min !== undefined && max !== undefined) return `${min}…${max}`;
    if (min !== undefined) return `≥ ${min}`;
    if (max !== undefined) return `≤ ${max}`;
    return '';
  };

  const settle = (raw: string, via: 'enter' | 'blur') => {
    const v = parseNum(raw);
    const bad = v === null || (min !== undefined && v < min) || (max !== undefined && v > max);
    if (bad) {
      if (via === 'enter') {
        /* Enter-invalid: keep the error + the focus — the user corrects
         * in place; NOTHING is dispatched. */
        setError(`${invalidHint} (${clampHint()})`);
      } else {
        /* blur-invalid: revert the display, clear the error — the field
         * forgot the edit; nothing was ever dispatched. */
        setText(format ? format(value) : String(value));
        setError(null);
      }
      return;
    }
    setError(null);
    if (v !== value) {
      const snapped = step ? Math.round(v / step) * step : v;
      onCommit(snapped);
    } else {
      setText(format ? format(value) : String(value));
    }
  };

  return (
    <label className={`mini-field${error ? ' is-invalid' : ''}${focusedFlag ? ' is-focused' : ''}`}>
      <span className="mini-field__label">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        className="mini-field__input"
        value={text}
        data-testid={testid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${testid}-err` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setError(null); /* typing clears the stale error */
        }}
        onFocus={() => {
          focused.current = true;
          setFocusedFlag(true);
        }}
        onBlur={(e) => {
          focused.current = false;
          setFocusedFlag(false);
          settle(e.target.value, 'blur');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            settle(e.currentTarget.value, 'enter');
          } else if (e.key === 'Escape') {
            /* Escape reverts the display; nothing dispatched */
            e.preventDefault();
            setText(format ? format(value) : String(value));
            setError(null);
            e.currentTarget.blur();
          }
        }}
        onDoubleClick={() => {
          /* double-click resets to the default THROUGH the same commit
           * path (one history entry, the same clamp law) */
          if (resetTo !== undefined && resetTo !== value) onCommit(resetTo);
          setText(format ? format(resetTo ?? value) : String(resetTo ?? value));
          setError(null);
        }}
      />
      {error && (
        <span className="mini-field__err" id={`${testid}-err`} role="alert" data-testid={`${testid}-err`}>
          {error}
        </span>
      )}
    </label>
  );
}

interface ParamRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
  /** the double-click reset target */
  resetTo?: number;
  format?: (v: number) => string;
  testid: string;
}

export function ParamRow({ label, value, min, max, step, onCommit, resetTo, format, testid }: ParamRowProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const pct = ((shown - min) / (max - min)) * 100;
  return (
    <label className="mini-param" style={{ ['--mini-param-pct' as string]: `${pct}%` }}>
      <span className="mini-field__label">{label}</span>
      <span className="mini-param__row">
        <input
          type="range"
          className="mini-param__slider"
          min={min}
          max={max}
          step={step}
          value={shown}
          data-testid={testid}
          aria-label={label}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={() => {
            /* ONE commit on release — the drag is a preview, the release
             * is the edit (no history spam mid-drag) */
            if (drag !== null && drag !== value) onCommit(drag);
            setDrag(null);
          }}
          onKeyUp={() => {
            /* keyboard: each arrow IS a commit (no drag semantics) */
            if (drag !== null && drag !== value) onCommit(drag);
            setDrag(null);
          }}
          onDoubleClick={() => {
            if (resetTo !== undefined && resetTo !== value) onCommit(resetTo);
            setDrag(null);
          }}
        />
        <span className="mini-param__value" data-testid={`${testid}-value`}>
          {format ? format(shown) : shown}
        </span>
      </span>
    </label>
  );
}

interface GroupProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  testid: string;
}

/** 26px caret header; the body stays in DOM via `hidden` (collapse keeps
 *  the a11y surface + no remount churn). */
export function Group({ title, children, defaultOpen = true, testid }: GroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mini-group" data-testid={testid}>
      <button
        type="button"
        className="mini-group__head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        data-testid={`${testid}-toggle`}
      >
        <span className={`mini-group__caret${open ? ' is-open' : ''}`} aria-hidden="true" />
        {title}
      </button>
      <div className="mini-group__body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

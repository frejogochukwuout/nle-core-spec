/* SourceEditBar.test — R20-W6FIX P1-1b: the component tests W2 promised
   and the adversarial review found missing. Recreates the six a11y tests
   the deleted EditOverlay carried (a44d715 removed panels/EditOverlay +
   its suite with no replacement), adapted to the SOURCE-mode law: the bar
   acts on sourceMediaId (the R19 wrong-asset bug), not mediaSelection.

   Covers: the one-shot toolbar shape (no radiogroup), the honest
   no-source toast, real placement + one-step undo, the replace/fitToFill
   degradation toasts, the wrong-asset regression pin, roving tabindex
   (horizontal), the ≥150ms hover/focus dwell law with fake timers
   (pointer/keyboard parity, no residue), ok:false previews painting NO
   insert-preview-layer geometry while the button tip carries the refusal
   (mounted with the Timeline — the layer's home), and the P2-3 kebab
   menu's APG keyboard law (↑/↓ wrap, Home/End, first-item-on-open,
   Escape → kebab). */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SourceEditBar } from './SourceEditBar';
import { Timeline } from '../timeline/Timeline';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

/** Recording ResizeObserver — captures callbacks so the ladder tests can
 *  fire them with a mocked bar rect (the MixerDock pattern; jsdom's default
 *  stub never fires). */
function withRecordingRO<T>(fn: (fire: () => void) => T): T {
  const cbs: ResizeObserverCallback[] = [];
  const Orig = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) { cbs.push(cb); }
    observe() { /* no-op */ }
    unobserve() { /* no-op */ }
    disconnect() { /* no-op */ }
  } as unknown as typeof ResizeObserver;
  try {
    return fn(() => { act(() => { cbs.forEach((cb) => cb([], {} as ResizeObserver)); }); });
  } finally {
    globalThis.ResizeObserver = Orig;
  }
}

const S = () => useUi.getState();
const countEls = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.reduce((m, t) => m + t.elements.length, 0);
const overlayEls = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!.elements;
const mainEls = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements;

const SOURCE: UiPatch = { viewerMode: 'source', sourceMediaId: 'm-03', selection: [] };
const boot = (patch: UiPatch = {}) => renderShell(<SourceEditBar />, { patch: { ...SOURCE, ...patch } });

const LABELS = ['Insert', 'Overwrite', 'Replace', 'Append at End', 'Ripple Overwrite', 'Place on Top', 'Fit to Fill'];
const SLUGS = ['insert', 'overwrite', 'replace', 'append-at-end', 'ripple-overwrite', 'place-on-top', 'fit-to-fill'];

/* ---- the recreated EditOverlay suite, source-mode law ---- */

describe('SourceEditBar — the 7 Resolve edit functions (recreated EditOverlay a11y suite)', () => {
  it('renders the 7 reference buttons with exact function names, as a HORIZONTAL one-shot toolbar', () => {
    boot({});
    const bar = screen.getByTestId('shell-source-edit-bar');
    expect(bar).toHaveAttribute('role', 'toolbar');
    expect(bar).toHaveAttribute('aria-orientation', 'horizontal');
    expect(bar).toHaveAttribute('aria-label', 'Edit functions');
    for (const label of LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    // hairline divider: the universal pair | the secondary modes
    expect(screen.getByRole('separator')).toBeInTheDocument();
    for (const slug of SLUGS) {
      expect(screen.getByTestId(`shell-source-edit-${slug}`)).toBeInTheDocument();
    }
    // ONE-SHOT ACTIONS, never a mode radiogroup (contract §2 — no NLE keeps
    // a persistent insert mode): no radio roles, no aria-pressed anywhere
    expect(bar.querySelectorAll('[role="radio"], [aria-pressed]')).toHaveLength(0);
    // the shared live description is described-by every button (§3.2)
    for (const slug of SLUGS) {
      expect(screen.getByTestId(`shell-source-edit-${slug}`)).toHaveAttribute('aria-describedby', 'shell-source-edit-desc');
    }
  });

  it('NO source asset → honest toast, nothing dispatched (never a silent no-op)', () => {
    boot({ sourceMediaId: null, selection: [] });
    const before = countEls();
    fireEvent.click(screen.getByTestId('shell-source-edit-insert'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Edit functions',
      detail: 'open a media asset in the source viewer first (the edit functions act on the source asset — Resolve semantics)',
    });
    expect(countEls()).toBe(before); // doc untouched
  });

  it('with a source asset, Insert performs the REAL placement (doc change + success toast + one-step undo)', () => {
    boot({ sourceMediaId: 'm-08', playhead: 16 });
    fireEvent.click(screen.getByTestId('shell-source-edit-insert'));
    // m-08 = title_card.png (image) → overlay lane, duration-less → 4s clip
    const els = overlayEls();
    expect(els).toHaveLength(2); // el-5 + the placed clip
    const placed = els.find((e) => e.name === 'title_card.png')!;
    expect(placed.startTime).toBe(16); // at the playhead, frame-snapped
    expect(placed.duration).toBe(4);
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'success', title: 'Inserted title_card.png' });
    // undoable as one step — ⌘Z removes the placed clip
    act(() => { S().undo(); });
    expect(overlayEls()).toHaveLength(1);
  });

  it('WRONG-ASSET regression pin: insert acts on sourceMediaId, never mediaSelection (R19 bug)', () => {
    // Clip 'Open in viewer' sets sourceMediaId WITHOUT touching
    // mediaSelection — the old dock inserted the POOL selection instead
    boot({ sourceMediaId: 'm-03', mediaSelection: ['m-08'], playhead: 16 });
    fireEvent.click(screen.getByTestId('shell-source-edit-insert'));
    const placed = mainEls().find((e) => e.mediaId === 'm-03' && e.startTime === 16)!;
    expect(placed).toBeDefined();
    expect(placed.name).toBe('drone_launch.mp4'); // the SOURCE asset
    expect(placed.mediaId).toBe('m-03'); // never m-08 (mediaSelection's pick)
    expect(overlayEls().some((e) => e.mediaId === 'm-08')).toBe(false);
  });

  it('replace degrades to its honest store toast when no clip is selected', () => {
    boot({ sourceMediaId: 'm-08', selection: [] });
    fireEvent.click(screen.getByTestId('shell-source-edit-replace'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Replace',
      detail: expect.stringContaining('select a clip on a compatible track first'),
    });
  });

  it('fitToFill degrades to its honest store toast for a duration-less source', () => {
    boot({ sourceMediaId: 'm-08', selection: [] }); // m-08 duration: null
    fireEvent.click(screen.getByTestId('shell-source-edit-fit-to-fill'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Fit to Fill',
      detail: expect.stringContaining('set an In/Out range (I / O) with duration'),
    });
  });

  it('roving tabindex: ONE tab stop; ←/→ move focus (wrapping), Home/End jump (horizontal toolbar law)', () => {
    boot({});
    const bar = screen.getByTestId('shell-source-edit-bar');
    const buttons = LABELS.map((l) => screen.getByRole('button', { name: l }));
    buttons[0]!.focus();
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1); // one tab stop
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(buttons[1]).toHaveFocus(); // Insert → Overwrite
    fireEvent.keyDown(bar, { key: 'End' });
    expect(buttons[6]).toHaveFocus(); // → Fit to Fill
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(buttons[0]).toHaveFocus(); // wraps to Insert
    fireEvent.keyDown(bar, { key: 'ArrowLeft' });
    expect(buttons[6]).toHaveFocus(); // wraps back
    fireEvent.keyDown(bar, { key: 'Home' });
    expect(buttons[0]).toHaveFocus();
  });
});

/* ---- C48: the hover-placement preview dwell law ---- */

describe('SourceEditBar — hover-placement preview (C48, ≥150ms dwell, fake timers)', () => {
  it('150ms dwell arms hoverInsertPreview; a quick pass never does; hover-out clears with no residue', () => {
    vi.useFakeTimers();
    try {
      boot({ playhead: 12 });
      const btn = screen.getByTestId('shell-source-edit-insert');
      // quick pass: enter + leave inside the dwell window — nothing arms
      fireEvent.mouseEnter(btn);
      act(() => { vi.advanceTimersByTime(149); });
      fireEvent.mouseLeave(btn);
      act(() => { vi.advanceTimersByTime(50); });
      expect(S().hoverInsertPreview).toBeNull();
      // dwell: the 150ms boundary arms the ambient preview (no toast)
      fireEvent.mouseEnter(btn);
      act(() => { vi.advanceTimersByTime(149); });
      expect(S().hoverInsertPreview).toBeNull(); // not yet
      act(() => { vi.advanceTimersByTime(1); });
      expect(S().hoverInsertPreview).toEqual({ mediaId: 'm-03', mode: 'insert' });
      expect(S().toasts).toHaveLength(0); // ambient state, never a toast event
      // hover-out clears immediately — no residue
      fireEvent.mouseLeave(btn);
      expect(S().hoverInsertPreview).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('focus parity: the focus event arms (keyboard = pointer); blur cancels + clears', () => {
    vi.useFakeTimers();
    try {
      boot({ playhead: 12 });
      const btn = screen.getByTestId('shell-source-edit-insert');
      // blur BEFORE the dwell cancels the timer — nothing arms
      fireEvent.focus(btn);
      act(() => { vi.advanceTimersByTime(100); });
      fireEvent.blur(btn);
      act(() => { vi.advanceTimersByTime(100); });
      expect(S().hoverInsertPreview).toBeNull();
      // focus + full dwell arms…
      fireEvent.focus(btn);
      act(() => { vi.advanceTimersByTime(150); });
      expect(S().hoverInsertPreview).toEqual({ mediaId: 'm-03', mode: 'insert' });
      // …blur clears (the hover-out equivalent)
      fireEvent.blur(btn);
      expect(S().hoverInsertPreview).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('unmount (width collapse / mode swap) never leaks a residue preview', () => {
    vi.useFakeTimers();
    try {
      const utils = boot({ playhead: 12 });
      const btn = screen.getByTestId('shell-source-edit-insert');
      fireEvent.mouseEnter(btn);
      act(() => { vi.advanceTimersByTime(150); });
      expect(S().hoverInsertPreview).toEqual({ mediaId: 'm-03', mode: 'insert' });
      utils.unmount();
      expect(S().hoverInsertPreview).toBeNull(); // the ambient state had exactly one owner
    } finally {
      vi.useRealTimers();
    }
  });

  it("R23-WE D-E2 (#102): a dwell-armed preview paints the MODE BADGE with the hovered mode's own name (the Timeline carries the layer)", () => {
    vi.useFakeTimers();
    try {
      // the Timeline owns the insert-preview layer (the badge's home) —
      // mount both, then drive the REAL 150ms dwell path
      renderShell(
        <>
          <Timeline />
          <SourceEditBar />
        </>,
        { patch: { viewerMode: 'source', sourceMediaId: 'm-03', selection: [], playhead: 16 } },
      );
      const ovw = screen.getByTestId('shell-source-edit-overwrite');
      fireEvent.mouseEnter(ovw);
      act(() => { vi.advanceTimersByTime(150); });
      const badge = screen.getByTestId('insert-preview-mode-badge');
      expect(badge).toHaveTextContent('Overwrite'); // the hovered button's own label
      expect(badge).toHaveAttribute('aria-hidden', 'true'); // chrome, not content
      // hover-out: the badge leaves WITH the preview — no residue chrome
      // (the display:none law: absence, never an opacity stub)
      fireEvent.mouseLeave(ovw);
      expect(screen.queryByTestId('insert-preview-mode-badge')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ok:false preview: NO insert-preview-layer geometry + the button tip shows the refusal reason', () => {
    vi.useFakeTimers();
    try {
      // the Timeline owns the insert-preview layer — mount both (the layer
      // is the plan's only geometry surface; the bar owns tips/status)
      renderShell(
        <>
          <Timeline />
          <SourceEditBar />
        </>,
        { patch: { viewerMode: 'source', sourceMediaId: 'm-08', selection: [], playhead: 16 } },
      );
      // POSITIVE control: insert previews REAL geometry for the same source
      // (m-08 image → overlay ghost at 16)
      const ins = screen.getByTestId('shell-source-edit-insert');
      fireEvent.mouseEnter(ins);
      act(() => { vi.advanceTimersByTime(150); });
      expect(screen.getByTestId('insert-preview-ghost')).toBeInTheDocument();
      fireEvent.mouseLeave(ins);
      expect(screen.queryByTestId('insert-preview-ghost')).toBeNull();
      // the refusal: fit-to-fill needs a duration — ok:false → NO geometry
      const ftf = screen.getByTestId('shell-source-edit-fit-to-fill');
      fireEvent.mouseEnter(ftf);
      act(() => { vi.advanceTimersByTime(150); });
      expect(screen.queryByTestId('insert-preview-layer')).toBeNull(); // never paint what the op won't perform
      expect(ftf).toHaveAttribute('data-refused', 'true');
      expect(ftf.getAttribute('data-tip')).toContain('set an In/Out range (I / O) with duration');
      expect(ftf.getAttribute('data-tip')).toContain('Fit to Fill');
      // the shared status line announces it (§3.2 refusal law)
      expect(screen.getByTestId('shell-source-edit-desc')).toHaveTextContent('Refused: Fit to Fill');
      fireEvent.mouseLeave(ftf);
      expect(S().hoverInsertPreview).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ---- P2-3 (R20-W6FIX): the kebab overflow menu's APG keyboard law ---- */

describe('SourceEditBar — the mode-button set (#83: always inline, no overflow)', () => {
  /* R22 #83: the kebab overflow is RETIRED — all 7 mode buttons are always
     inline (the reviewer saw only two: "you only showed two buttons here").
     R24-W5b (F1 P1) SUPERSEDES the narrow-width WRAP law: the bar lives in
     the FIXED 32px transport row, so at narrow widths it now SCROLLS
     (overflow-x-auto) — one row, never a second. */
  it('R22 #83: ALL SEVEN mode buttons are always visible inline — no kebab, no overflow menu', () => {
    boot();
    const labels = ['Insert', 'Overwrite', 'Replace', 'Append at End', 'Ripple Overwrite', 'Place on Top', 'Fit to Fill'];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: new RegExp('^' + label) })).toBeInTheDocument();
    }
    expect(screen.queryByTestId('shell-source-edit-overflow')).toBeNull();
    expect(screen.queryByTestId('shell-source-edit-overflow-menu')).toBeNull();
  });

  /* RE-PIN (W1-A, DESIGN-R25 §3 R1 supersedes the W5b overflow-as-primary
     law): the one-row law SURVIVES (h-8, no flex-wrap) but the narrow-width
     grammar is now the PRIORITY LADDER — icon+label buttons while the bar's
     measured width can hold them (data-labels="full"), icon-only below the
     floor (data-labels="icons"; the names live in aria-label + data-tip);
     overflow-x-auto is the LAST resort below the icon-only floor. jsdom's
     silent RO = un-measured = FULL (the deterministic default). */
  it('RE-PIN W1-A: ONE ROW (h-8, no flex-wrap) + the 24px hit FLOOR; default (un-measured) = data-labels="full" with visible names', () => {
    boot();
    const bar = screen.getByTestId('shell-source-edit-bar');
    expect(bar).toHaveAttribute('data-labels', 'full'); // un-measured → full
    expect(bar.className).toContain('flex');
    expect(bar.className).toContain('h-8');
    expect(bar.className).not.toContain('flex-wrap');
    // the LAST-resort escape survives (below the icon-only floor only)
    expect(bar.className).toContain('overflow-x-auto');
    // the house 24px hit floor on every mode button (the F1 sweep law) +
    // the W1-A full mode: icon + visible label per button
    for (const slug of SLUGS) {
      const b = screen.getByTestId(`shell-source-edit-${slug}`);
      expect(b.className).toContain('!h-[24px]');
      expect(b.textContent).not.toBe(''); // the visible name (full mode)
    }
  });

  it('W1-A: the measured ladder — a narrow bar (400px) drops to data-labels="icons" (icon-only, names in aria-label + data-tip, 7 buttons ALL present)', () => {
    let fire = () => { /* assigned below */ };
    withRecordingRO((f) => { fire = f; boot(); });
    const bar = screen.getByTestId('shell-source-edit-bar');
    // a 400px bar (the reviewer's 700–1100px-canvas band): icon-only
    bar.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 400, bottom: 32, width: 400, height: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    act(() => fire());
    expect(bar).toHaveAttribute('data-labels', 'icons');
    const btns = bar.querySelectorAll('button');
    expect(btns).toHaveLength(7); // ALL SEVEN visible — never a hidden mode
    for (const b of btns) {
      expect(b.className).toContain('!h-[24px]');
      expect(b.className).toContain('!w-[24px]');
      expect(b.getAttribute('aria-label')).toBeTruthy(); // the name survives
      expect(b.textContent).toBe(''); // no visible label in icons mode
    }
    // a wide bar (800px) returns to full labels
    bar.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 800, bottom: 32, width: 800, height: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    act(() => fire());
    expect(bar).toHaveAttribute('data-labels', 'full');
    expect(screen.getByTestId('shell-source-edit-insert').textContent).toBe('Insert');
  });

  /* R25-F1-E2: the label floor dropped 660 → 420 + the names TRUNCATE. The
     660 floor was honest content math on the WRONG quantity — the bar eats
     the transport row's LEFTOVERS (measured 336px@1500px viewport,
     302px@1280), so labels only appeared above ~1830px viewports: every
     normal canvas got icon-only buttons. Now: labels render from ≥420px and
     ellipsize to whatever the row feeds the bar (Resolve truncates, never
     drops); icon-only only below 420. */
  it('R25-F1-E2: the label-mode thresholds — full at the 420px floor (was 660), icons at 419; the names TRUNCATE in full mode', () => {
    let fire = () => { /* assigned below */ };
    withRecordingRO((f) => { fire = f; boot(); });
    const bar = screen.getByTestId('shell-source-edit-bar');
    const rect = (width: number) =>
      ({ top: 0, left: 0, right: width, bottom: 32, width, height: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    // just BELOW the floor → icon-only (the old 660 floor would have flipped
    // at this width too — the reviewer's 700–1100px canvas band)
    bar.getBoundingClientRect = () => rect(419);
    act(() => fire());
    expect(bar).toHaveAttribute('data-labels', 'icons');
    // AT the floor → full labels: the 336px@1500px-viewport leftover band now
    // shows names once the readouts degrade (row <720 hides the 178px
    // duration readout — the ~1100px canvas case)
    bar.getBoundingClientRect = () => rect(420);
    act(() => fire());
    expect(bar).toHaveAttribute('data-labels', 'full');
    // the truncation law: every full-mode label span carries truncate +
    // min-w-0 and the FULL name rides the title tooltip (ellipsis, not drop)
    for (const slug of SLUGS) {
      const b = screen.getByTestId(`shell-source-edit-${slug}`);
      expect(b.className).toContain('!shrink'); // the button yields to the row (min 24px)
      expect(b.className).toContain('min-w-[24px]'); // the hit floor survives the shrink
      const span = b.querySelector('span[title]');
      expect(span).not.toBeNull();
      expect(span!.className).toContain('truncate');
      expect(span!.className).toContain('min-w-0');
    }
    // the shortened visible name: 'Append' on the button, the FULL reference
    // name in aria-label + title (one a11y name, the reference wording)
    const append = screen.getByTestId('shell-source-edit-append-at-end');
    expect(append).toHaveAccessibleName('Append at End');
    expect(append.textContent).toBe('Append');
    expect(append.querySelector('span')!).toHaveAttribute('title', 'Append at End');
  });

  it('R22 #83: the 7-button arrow cycle covers every mode in DOM order (no hidden stops)', () => {
    boot();
    const order = ['Insert', 'Overwrite', 'Replace', 'Append at End', 'Ripple Overwrite', 'Place on Top', 'Fit to Fill'];
    const first = screen.getByRole('button', { name: /^Insert/ });
    first.focus();
    for (let i = 1; i <= 7; i++) {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      const expectName = order[i % 7];
      expect((document.activeElement as HTMLElement).getAttribute('aria-label')?.startsWith(expectName)).toBe(true);
    }
  });
});

/* plain-render sanity: the bar is store-only (no variant/confirm context) */
describe('SourceEditBar — standalone mount', () => {
  it('renders without the provider stack (store-only component)', () => {
    render(<SourceEditBar />);
    expect(screen.getByTestId('shell-source-edit-bar')).toBeInTheDocument();
  });
});

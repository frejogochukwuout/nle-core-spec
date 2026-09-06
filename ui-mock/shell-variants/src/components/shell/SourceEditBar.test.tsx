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

describe('SourceEditBar — kebab overflow menu (P2-3: APG menu keyboard roving)', () => {
  /** jsdom never lays out (clientWidth 0 = unknown = stays EXPANDED) —
   *  force a REAL narrow measure on the prototype so the collapse fires. */
  const narrowBoot = () => {
    const cw = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    const utils = renderShell(<SourceEditBar />, { patch: { ...SOURCE } });
    return { utils, cw };
  };
  const menuItems = () =>
    Array.from(screen.getByTestId('shell-source-edit-overflow-menu').querySelectorAll<HTMLElement>('[role="menuitem"]'));

  it('collapsed bar: the 5 secondary modes live ONLY in the kebab menu; open focuses the FIRST item', () => {
    vi.useFakeTimers();
    const { cw } = narrowBoot();
    try {
      expect(screen.queryByTestId('shell-source-edit-replace')).toBeNull(); // not inline
      const kebab = screen.getByTestId('shell-source-edit-overflow');
      expect(kebab).toHaveAttribute('aria-haspopup', 'menu');
      expect(kebab).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(kebab);
      const menu = screen.getByTestId('shell-source-edit-overflow-menu');
      expect(menu).toHaveAttribute('role', 'menu');
      expect(kebab).toHaveAttribute('aria-expanded', 'true');
      const items = menuItems();
      expect(items).toHaveLength(5);
      // APG: all items tabIndex -1 (focus is programmatic)
      expect(items.every((i) => i.tabIndex === -1)).toBe(true);
      // focus lands on the FIRST item on open
      expect(items[0]).toHaveFocus();
      // Escape closes + returns focus to the kebab (the invoking control)
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('shell-source-edit-overflow-menu')).toBeNull();
      expect(kebab).toHaveFocus();
    } finally {
      cw.mockRestore();
      vi.useRealTimers();
    }
  });

  it('↑/↓ move focus among the items (wrapping); Home/End jump the ends', () => {
    vi.useFakeTimers();
    const { cw } = narrowBoot();
    try {
      const kebab = screen.getByTestId('shell-source-edit-overflow');
      fireEvent.click(kebab);
      const items = menuItems();
      expect(items[0]).toHaveFocus();
      fireEvent.keyDown(items[0]!, { key: 'ArrowDown' });
      expect(items[1]).toHaveFocus();
      fireEvent.keyDown(items[1]!, { key: 'End' });
      expect(items[4]).toHaveFocus();
      fireEvent.keyDown(items[4]!, { key: 'ArrowDown' });
      expect(items[0]).toHaveFocus(); // wraps ↓
      fireEvent.keyDown(items[0]!, { key: 'ArrowUp' });
      expect(items[4]).toHaveFocus(); // wraps ↑
      fireEvent.keyDown(items[4]!, { key: 'Home' });
      expect(items[0]).toHaveFocus();
      // the horizontal toolbar rover never hijacks mid-menu (stopPropagation)
      fireEvent.keyDown(items[0]!, { key: 'ArrowRight' });
      expect(items[0]).toHaveFocus();
      fireEvent.keyDown(items[0]!, { key: 'ArrowLeft' });
      expect(items[0]).toHaveFocus();
    } finally {
      cw.mockRestore();
      vi.useRealTimers();
    }
  });

  it('activating an item commits the edit AND returns focus to the kebab (never a stranded node)', () => {
    vi.useFakeTimers();
    const { cw } = narrowBoot();
    try {
      const kebab = screen.getByTestId('shell-source-edit-overflow');
      fireEvent.click(kebab);
      const items = menuItems();
      // items[1] = Append at End — commits a real doc change
      fireEvent.click(items[1]!);
      expect(screen.queryByTestId('shell-source-edit-overflow-menu')).toBeNull();
      expect(kebab).toHaveFocus();
      expect(S().toasts.at(-1)).toMatchObject({ kind: 'success', title: 'Appended drone_launch.mp4' });
      expect(mainEls().at(-1)!.mediaId).toBe('m-03');
    } finally {
      cw.mockRestore();
      vi.useRealTimers();
    }
  });

  it('outside pointerdown closes the menu (pointer parity for the close law)', () => {
    vi.useFakeTimers();
    const { cw, utils } = narrowBoot();
    try {
      fireEvent.click(screen.getByTestId('shell-source-edit-overflow'));
      expect(screen.getByTestId('shell-source-edit-overflow-menu')).toBeInTheDocument();
      fireEvent.pointerDown(document.body);
      expect(screen.queryByTestId('shell-source-edit-overflow-menu')).toBeNull();
      expect(utils).toBeDefined();
    } finally {
      cw.mockRestore();
      vi.useRealTimers();
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

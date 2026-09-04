/* Clip component tests — selection state (05 §7.3), linked badge (05 §12.3),
   waveform vs filmstrip vs text bodies, offline + effect badges, blade-cut
   affordance, drag/trim/alt-duplicate commits + Esc cancel (18 §5 optimistic
   commit), locked lanes, and the §4.9 clip menu (mix-track escalation,
   §6.4 multi-delete confirmation). Drags are driven with raw pointer events
   dispatched at the clip itself (jsdom has no pointer-capture retargeting,
   which is exactly what these handlers fall back to). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Clip } from './Clip';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

/* snap targets mirroring the real Timeline set (clip edges + playhead) */
const SNAP = [0, 8.5, 17, 24, 30, 16];

/** Stands the active scene's lanes up like Timeline does (static read — Clip
 *  subscribes to the store itself for selection/tool-driven visuals). */
function Lanes() {
  const scene = useUi.getState().scenes.find((s) => s.id === 'sc-1')!;
  return (
    <>
      {scene.tracks.map((t) => {
        const h = t.kind === 'main' ? 80 : 60;
        return (
          <div key={t.id} style={{ position: 'relative', height: h, width: 1400 }}>
            {t.elements.map((el) => (
              <Clip key={el.id} el={el} track={t} pxPerSec={46} laneHeight={h} snapTargets={SNAP} />
            ))}
          </div>
        );
      })}
    </>
  );
}

const boot = (patch: UiPatch = {}) => renderShell(<Lanes />, { patch });

const el = (id: string) => {
  for (const sc of store().scenes) for (const t of sc.tracks) {
    const hit = t.elements.find((e) => e.id === id);
    if (hit) return hit;
  }
  throw new Error(`element ${id} not found`);
};
const mainIds = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements.map((e) => e.id);
const countEls = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.reduce((m, t) => m + t.elements.length, 0);

describe('Clip', () => {
  it('selected clips get the accent outline; the clip is a labelled button (spec 05 §7.3)', () => {
    boot({ selection: ['el-2'] });
    const sel = screen.getByTestId('clip-el-2');
    expect(sel).toHaveAttribute('role', 'button');
    expect(sel).toHaveAttribute('aria-label', 'Marina interview, 00:00:08:12');
    expect(sel.style.outline).toContain('var(--accent-selection)');
    expect(screen.getByTestId('clip-el-1').style.outline).toBe('none');
  });

  it('the linked A/V badge only appears on clips with linkedTo (spec 05 §12.3)', () => {
    boot({});
    // el-2 ↔ el-7 are the only linked pair in the fixture
    expect(document.querySelectorAll('[aria-label="Linked audio and video"]').length).toBe(2);
    expect(screen.getByTestId('clip-el-2').querySelector('[title="Linked A/V"]')).not.toBeNull();
    expect(screen.getByTestId('clip-el-1').querySelector('[title="Linked A/V"]')).toBeNull();
  });

  it('audio clips render a waveform body + fade ramps, not a filmstrip (spec 05 §7.1/§9)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-6');
    expect(clip.querySelectorAll('svg rect').length).toBeGreaterThan(10); // waveform bars
    // el-6 has audioFadeIn 1 s / audioFadeOut 2 s → both ramp overlays (46 px/s)
    expect(clip.querySelectorAll('svg.pointer-events-none').length).toBe(2);
    expect(clip.querySelector('div[style*="background-image"]')).toBeNull(); // no thumbnail strip
  });

  it('video clips render the filmstrip thumbnail; offline media gets the OFFLINE badge (spec 18 §4.2)', () => {
    // no fixture clip uses the offline asset m-04 — point el-4 at it
    useUi.setState({
      scenes: store().scenes.map((s) =>
        s.id === 'sc-1'
          ? { ...s, tracks: s.tracks.map((t) =>
              t.id === 'tr-main' ? { ...t, elements: t.elements.map((e) =>
                e.id === 'el-4' ? { ...e, mediaId: 'm-04' } : e) } : t) }
          : s,
      ),
    });
    boot({});
    const thumb = screen.getByTestId('clip-el-1').querySelector('div[style*="background-image"]') as HTMLElement | null;
    expect(thumb).not.toBeNull();
    expect(thumb!.style.backgroundImage).toContain('beach_wide.jpg');
    expect(screen.getByTestId('clip-el-4')).toHaveTextContent('OFFLINE');
    expect(screen.getByTestId('clip-el-1')).not.toHaveTextContent('OFFLINE');
  });

  it('text clips render the centered text-clip body (spec 05 §7.3 clip kinds)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-5');
    expect(clip.innerHTML).toContain('var(--clip-text)');
    expect(clip).toHaveTextContent('MARINA — FISHERWOMAN');
  });

  it('the F effect badge only appears when an effect is enabled (spec 18 §9 badges)', () => {
    const first = boot({});
    expect(screen.queryByText('F')).toBeNull(); // fx-1 ships disabled
    first.unmount();
    const scenes = store().scenes.map((s) =>
      s.id === 'sc-1'
        ? { ...s, tracks: s.tracks.map((t) =>
            t.id === 'tr-main' ? { ...t, elements: t.elements.map((e) =>
              e.id === 'el-1' ? { ...e, effects: [{ id: 'fx-1', name: 'Gaussian Blur', enabled: true }] } : e) } : t) }
        : s,
    );
    useUi.setState({ scenes });
    renderShell(<Lanes />);
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('clicking selects; shift-click extends the selection additively (spec 16 selection)', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('clip-el-1'));
    expect(store().selection).toEqual(['el-1']);
    // el-2 is A/V-linked to el-7 (spec 05 §12.3: selecting one selects both) —
    // the pair joins the additive selection as a group
    fireEvent.click(screen.getByTestId('clip-el-2'), { shiftKey: true });
    expect(store().selection).toEqual(['el-1', 'el-2', 'el-7']);
  });

  it('blade tool: crosshair cursor + click splits at the click position (spec 16 B / 15 split)', () => {
    boot({ tool: 'blade' });
    const clip = screen.getByTestId('clip-el-1');
    expect(clip.style.cursor).toBe('crosshair');
    expect(screen.getByTestId('clip-el-2').style.cursor).toBe('crosshair');
    fireEvent.click(clip, { clientX: 100 }); // rect.left = 0 in jsdom → cut at 100/46 s
    expect(mainIds()).toContain('el-1-b4');
    expect(mainIds()).toHaveLength(5);
  });

  it('blade click at the clip edge is a no-op that leaves history clean (spec 18 §6.1 no-pollution)', () => {
    boot({ tool: 'blade' });
    fireEvent.click(screen.getByTestId('clip-el-1'), { clientX: 0 }); // cutTime = startTime
    expect(mainIds()).toHaveLength(4);
    expect(store().past).toHaveLength(0);
  });

  it('a move drag commits moveElement and pushes one undo entry (spec 18 §5 optimistic → commit)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 }); // 8.5 s × 46
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 }); // +98 px → 10.625 s
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument(); // live TC bubble
    fireEvent.pointerUp(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBeCloseTo(10.625, 4);
    expect(store().past).toHaveLength(1);
  });

  it('Alt+drag duplicates: ghost at the original, copy lands at the drop, original stays (spec 18 §5)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, altKey: true });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489, altKey: true });
    expect(screen.getByTestId('clip-ghost-el-2')).toBeInTheDocument(); // faded ghost pinned at 8.5 s
    fireEvent.pointerUp(clip, { pointerId: 1 });
    const newId = store().selection[0]!;
    expect(newId).toMatch(/^el-2-d/);
    expect(el(newId).startTime).toBeCloseTo(10.625, 4);
    expect(el('el-2').startTime).toBe(8.5); // original never moves
    expect(mainIds()).toHaveLength(5);
  });

  it('Escape mid-drag cancels: nothing commits, no history entry (spec 16 §3.3 escape)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    fireEvent.pointerUp(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    expect(store().selection).toEqual(['el-2']); // boot selection survives
  });

  it('the left trim handle commits trimElement(l) with the new start/duration (spec 05 §14.2)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    const leftHandle = clip.querySelector('div.w-3') as HTMLElement; // first w-3 strip = left edge
    fireEvent.pointerDown(leftHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(leftHandle, { pointerId: 1, buttons: 1, clientX: 300 }); // −91 px → 157/24 s
    fireEvent.pointerUp(leftHandle, { pointerId: 1 });
    expect(el('el-2').startTime).toBeCloseTo(157 / 24, 4);
    expect(el('el-2').duration).toBeCloseTo(17 - 157 / 24, 4);
  });

  it('clips on a locked track are inert: no pointer events, stripes overlay, click does nothing (18 §4.5)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-7'); // tr-audio-2 ships locked
    expect(clip.style.pointerEvents).toBe('none');
    expect(clip.style.cursor).toBe('not-allowed');
    expect(clip.querySelector('.locked-stripes')).not.toBeNull();
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2']); // unchanged
  });

  it('double-clicking an audio clip escalates into audio focus on its track (design doc §3.1 M3)', () => {
    boot({});
    fireEvent.doubleClick(screen.getByTestId('clip-el-6'));
    expect(store().page).toBe('audio');
    expect(store().mixerState).toBe('full');
    expect(store().audioLaneBoost).toBe(true);
    expect(store().stripFocus).toBe('tr-audio-1');
  });

  it('the §4.9 clip menu: Mix-this-track escalates into audio focus (design doc §3.1)', () => {
    boot({});
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    expect(screen.getByTestId('shell-menu-clip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-menu-clip-mix-track'));
    expect(store().page).toBe('audio');
    expect(store().stripFocus).toBe('tr-main'); // the video track the clip sits on
  });

  it('multi-delete of ≥ 5 clips confirms first; cancel keeps, confirm deletes (spec 18 §6.4)', () => {
    boot({ selection: ['el-1', 'el-2', 'el-3', 'el-4', 'el-5'] });
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByTestId('shell-menu-clip-delete'));
    expect(screen.getByTestId('shell-confirm')).toBeInTheDocument();
    expect(screen.getByText('Delete 5 clips?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-confirm-cancel'));
    expect(countEls()).toBe(7); // nothing deleted
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByTestId('shell-menu-clip-delete'));
    fireEvent.click(screen.getByTestId('shell-confirm-confirm'));
    expect(countEls()).toBe(2); // el-6 + el-7 remain
  });
});

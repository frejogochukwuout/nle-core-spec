/* Clip component tests — selection state (05 §7.3), linked badge (05 §12.3),
   waveform vs filmstrip vs text bodies, offline + effect badges, blade-cut
   affordance, drag/trim/alt-duplicate commits + Esc cancel (18 §5 optimistic
   commit), locked lanes, and the §4.9 clip menu (mix-track escalation,
   §6.4 multi-delete confirmation). Drags are driven with raw pointer events
   dispatched at the clip itself (jsdom has no pointer-capture retargeting,
   which is exactly what these handlers fall back to). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Clip, EFFECT_DRAG_TYPE } from './Clip';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { POOL_DRAG_TYPE } from '../shell/MediaPool';

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
    expect(mainIds().some((id) => id.startsWith('el-1-b'))).toBe(true);
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
    /* R15 T3: moves now REJECT half-open overlaps (spec-05 §8.3) — main has
       no free spot between the clips, so the drag lands past the tail
       (30 s content end): 8.5 s + 30 s = 38.5 s. */
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 }); // 8.5 s × 46
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771 }); // +1380 px → 38.5 s
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument(); // live TC bubble
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771 });
    expect(el('el-2').startTime).toBeCloseTo(38.5, 4);
    expect(store().past).toHaveLength(1);
  });

  it('an overlapping drop is REJECTED: no move, no history, honest toast (R15 T3 / spec-05 §8.3)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 }); // 8.5 → 10.625: overlaps el-3 [17,24)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 489 });
    expect(el('el-2').startTime).toBe(8.5); // never moved
    expect(store().past).toHaveLength(0);
    expect(store().toasts.at(-1)!.title).toBe('Drop rejected');
    expect(store().toasts.at(-1)!.detail).toBe('clips would overlap (spec-05 §8.3)');
  });

  it('Alt+drag duplicates: ghost at the original, copy lands at the drop, original stays (spec 18 §5)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    // free-spot drop (38.5 s — see the overlap-rejection note above)
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, altKey: true });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771, altKey: true });
    expect(screen.getByTestId('clip-ghost-el-2')).toBeInTheDocument(); // faded ghost pinned at 8.5 s
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771 });
    const newId = store().selection[0]!;
    expect(newId).toMatch(/^el-2-d/);
    expect(el(newId).startTime).toBeCloseTo(38.5, 4);
    expect(el('el-2').startTime).toBe(8.5); // original never moves
    expect(mainIds()).toHaveLength(5);
    expect(store().past).toHaveLength(1); // ONE composite entry (duplicate + resolved move)
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

  /* ---- R15 T2 gesture discipline (canonical §5: 5px threshold,
     drag-back-cancel, buttons-mask, lastGestureWasDrag) ---- */

  it('a sub-threshold press-drag-release is a plain click: no preview, no move, no history (R15 T2 5px threshold)', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: 100 });
    // Δ4px — under the strict >5px activation threshold
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 395, clientY: 100 });
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument(); // no optimistic preview
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 395, clientY: 100 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    // under-threshold release = plain click — select semantics preserved
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2', 'el-7']); // A/V pair joins (spec 05 §12.3)
  });

  it('crossing the threshold activates the drag: exactly 5px does NOT, 6px does — on either axis (strict >)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: 100 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 396, clientY: 100 }); // Δx = 5 → still pending
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 397, clientY: 100 }); // Δx = 6 → active
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    // Y axis counts on its own: a 6px vertical move activates too
    fireEvent.pointerDown(clip, { pointerId: 2, button: 0, clientX: 391, clientY: 100 });
    fireEvent.pointerMove(clip, { pointerId: 2, buttons: 1, clientX: 391, clientY: 106 }); // Δy = 6
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    fireEvent.pointerUp(clip, { pointerId: 2, clientX: 391, clientY: 106 }); // Δ > 5 → not drag-back
    expect(el('el-2').startTime).toBe(8.5); // dt = 0 — no move committed
    expect(store().past).toHaveLength(0);
  });

  it('drag-back-cancel: a release back within 5px of the gesture origin is a CANCEL — no write, no history, click may select', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: 100 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489, clientY: 100 }); // activate + preview
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 393, clientY: 102 }); // back within 5px (both axes)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 393, clientY: 102 });
    expect(el('el-2').startTime).toBe(8.5); // never moved
    expect(store().past).toHaveLength(0); // canonical: no history entry
    // lastGestureWasDrag = false on the drag-back path — the follow-up click selects
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2', 'el-7']);
  });

  it('buttons-mask: a mid-drag move with the left button released cancels the gesture (no commit)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 0, clientX: 500 }); // button dropped off-window
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument(); // preview discarded
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 500 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
  });

  it('pointercancel discards the gesture without committing (R15 T2)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    fireEvent.pointerCancel(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument();
  });

  it('lastGestureWasDrag: the follow-up click after a committed drag is swallowed; the next click selects', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771 }); // 38.5 s free spot (R15 T3 overlap law)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771 });
    expect(el('el-2').startTime).toBeCloseTo(38.5, 4);
    fireEvent.click(clip); // the browser-synthesized follow-up click — NOT a re-select
    expect(store().selection).toEqual([]);
    fireEvent.click(clip); // flag consumed — a genuine click selects again
    expect(store().selection).toEqual(['el-2', 'el-7']);
  });

  it('after an Esc-cancelled drag the trailing click may select (canonical cancel() clears the flag)', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    fireEvent.pointerUp(clip, { pointerId: 1 });
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2', 'el-7']);
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

  /* R15 T2: the POINTER right-click route moved to the Timeline scroll
     surface (single contextmenu router, canonical no-stopPropagation law) —
     see Timeline.test.tsx for the routed clip-menu tests. The clip keeps the
     §4.9 KEYBOARD route: */
  it('the §4.9 keyboard route (Shift+F10) opens the clip menu and its commands dispatch (R15 T2 restructure)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.keyDown(clip, { key: 'F10', shiftKey: true });
    expect(screen.getByTestId('shell-menu-clip')).toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-clip-split')).toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-clip-ripple-delete')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-menu-clip-duplicate'));
    expect(mainIds()).toHaveLength(5); // duplicate committed via the keyboard-opened menu
  });
});

/* R14 wiring: ARIA button activation (Enter/Space) + the effects-rail drop
   target (application/x-nle-effect payloads — the AppShell effects rail's
   drag rows land as real store mutations, mirroring the lane pool-drop
   grammar). dataTransfer stubs follow the Timeline.test drop pattern. */
const fxPayload = (name: string, cat: string) => ({
  types: [EFFECT_DRAG_TYPE],
  getData: (t: string) => (t === EFFECT_DRAG_TYPE ? JSON.stringify({ name, cat }) : ''),
  dropEffect: '',
});

describe('Clip keyboard activation (ARIA button pattern, spec 18 §11)', () => {
  it('Enter and Space select; Shift+Enter extends additively (A/V pair joins)', () => {
    boot({ selection: [] });
    fireEvent.keyDown(screen.getByTestId('clip-el-1'), { key: 'Enter' });
    expect(store().selection).toEqual(['el-1']);
    fireEvent.keyDown(screen.getByTestId('clip-el-2'), { key: 'Enter', shiftKey: true });
    expect(store().selection).toEqual(['el-1', 'el-2', 'el-7']); // 05 §12.3 pair as a group
  });

  it('Space is prevented (no page scroll) and locked clips stay inert on Enter', () => {
    boot({ selection: [] });
    // fireEvent returns false when the handler called preventDefault
    expect(fireEvent.keyDown(screen.getByTestId('clip-el-1'), { key: ' ' })).toBe(false);
    expect(store().selection).toEqual(['el-1']);
    fireEvent.keyDown(screen.getByTestId('clip-el-7'), { key: 'Enter' }); // tr-audio-2 ships locked
    expect(store().selection).toEqual(['el-1']); // unchanged — same inert contract as clicks
  });
});

describe('Clip effects-rail drop target (R14 wiring)', () => {
  // the MIME contract is FIXED (AppShell EffectsPanel sets the same string) —
  // pin the literal so a silent rename on either side fails here first
  it('exports the fixed effects-rail drag MIME type', () => {
    expect(EFFECT_DRAG_TYPE).toBe('application/x-nle-effect');
  });

  it('an effect drag rings the clip; a Blur drop adds the effect with nominal defaults', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-3'); // no fixture effects on el-3
    fireEvent.dragOver(clip, { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    expect(clip.className).toContain('ring-accent'); // subtle ring while hovering
    fireEvent.drop(clip, { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    const fx = el('el-3').effects!;
    expect(fx).toHaveLength(1);
    expect(fx[0]!.name).toBe('Gaussian Blur');
    expect(fx[0]!.enabled).toBe(true);
    expect(fx[0]!.params).toEqual({ radius: 12 }); // Inspector's PARAM_DEFAULTS twin
    expect(clip.className).not.toContain('ring-accent'); // ring cleared on drop
    expect(store().past).toHaveLength(1); // one undoable addEffectToElement
  });

  it('a Transition drop sets transitionOut to the picked presentation on the crossfade type', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Dip to Black', 'Transition') });
    const tr = el('el-3').transitionOut!;
    expect(tr.type).toBe('crossfade'); // the mock's ONLY transition type — honest mapping
    expect(tr.presentation).toBe('Dip to Black');
  });

  it('unknown effect / transition names get honest toasts; nothing commits', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Nuke It', 'Stylize') });
    expect(store().toasts.at(-1)!.title).toBe('Unknown effect');
    expect(el('el-3').effects ?? []).toHaveLength(0);
    expect(store().past).toHaveLength(0);
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Melt', 'Transition') });
    expect(store().toasts.at(-1)!.title).toBe('Unknown transition');
    expect(el('el-3').transitionOut).toBeUndefined();
  });

  it('locked tracks refuse the drop (not-allowed, no commit); pool drags never ring', () => {
    boot({});
    const locked = screen.getByTestId('clip-el-7'); // tr-audio-2 ships locked
    const dt = fxPayload('Gaussian Blur', 'Blur');
    fireEvent.dragOver(locked, { dataTransfer: dt });
    expect(locked.className).not.toContain('ring-accent');
    expect(dt.dropEffect).toBe('none'); // not-allowed cursor grammar
    fireEvent.drop(locked, { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    expect(el('el-7').effects ?? []).toHaveLength(0);
    expect(store().past).toHaveLength(0);
    // a media-pool drag is not an effect drag: no ring, no effect commit
    const el1 = screen.getByTestId('clip-el-1');
    fireEvent.dragOver(el1, { dataTransfer: { types: [POOL_DRAG_TYPE], dropEffect: '' } });
    expect(el1.className).not.toContain('ring-accent');
  });
});

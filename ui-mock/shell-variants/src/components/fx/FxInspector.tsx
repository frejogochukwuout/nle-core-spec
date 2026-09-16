/* FxInspector — R23-WA (DESIGN-R23 D-A4/D-A6): the FX surface's parametric
   rail. THREE modes, ONE component, TWO frames:
   - transition selected → the shared TransitionSection (Inspector.tsx's own
     rows — presentation / duration / alignment; Remove is LIVE via
     removeTransition);
   - fade selected → duration row (setFade) + remove (removeFade);
   - clip selected (no FX object) → the shared EffectsSection — #105's
     "selecting the clip itself will just inspect Effects instead of
     Transitions".
   Frames: `FxInspector` is the FX page's right rail (own scroll + empty
   state); `FxInspectorSection` is the section form the Edit-page Inspector
   embeds at the top while selectedFxObject holds (D-A4). The
   ColorInspector/ColorInspectorRail duplication that R22 killed is the law
   here: the SECTION is shared, only the frame differs.
   Stale-id belt-and-braces: a selectedFxObject whose element vanished (scene
   switch guards in-store; this is the second net) renders nothing. */

import { Sparkles, X } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { findElement, effectiveFade, type ElementJSON, type SceneJSON } from '../../lib/mockData';
import { EffectsSection, TransitionSection, nextOnTrack, Group, ParamRow } from '../shell/Inspector';

/** resolve the selected FX object's element (null = stale id / nothing). */
const fxTarget = (scenes: SceneJSON[], elementId: string): { scene: SceneJSON; element: ElementJSON } | null => {
  const hit = findElement(scenes, elementId);
  return hit ? { scene: hit.scene, element: hit.element } : null;
};

/* ---- the fade editor (fade mode) ---------------------------------------- */

function FadeSection({ el, side }: { el: ElementJSON; side: 'in' | 'out' }) {
  const setFade = useUi((s) => s.setFade);
  const removeFade = useUi((s) => s.removeFade);
  return (
    <Group title={`Fade ${side === 'in' ? 'In' : 'Out'}`}>
      <p className="text-[11px] leading-relaxed text-tmuted">
        {el.name} · {side === 'in' ? 'head' : 'tail'} fade
        {el.type === 'audio' ? ' (audio level ramp — the audioFadeIn/Out domain)' : ' (opacity ramp — the fadeIn/fadeOut domain)'}
      </p>
      <ParamRow
        label="Duration"
        value={effectiveFade(el, side)}
        min={0}
        max={el.duration}
        step={0.1}
        unit="s"
        decimals={2}
        timeField
        resetTo={0.5}
        title="Effective fade duration — setFade writes the element's own fade domain (store-owned clamp [0, clip duration])"
        onCommit={(v) => setFade(el.id, side, v)}
      />
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="mini-btn"
          aria-label={`Remove fade ${side}`}
          onClick={() => removeFade(el.id, side)}
        >
          <X size={12} strokeWidth={1.6} /> Remove fade
        </button>
      </div>
    </Group>
  );
}

/* ---- the section form (both frames render THIS) ------------------------- */

export function FxInspectorSection() {
  const scenes = useUi((s) => s.scenes);
  const selectedFxObject = useUi((s) => s.selectedFxObject);
  const selection = useUi((s) => s.selection);
  const selectedEffectId = useUi((s) => s.selectedEffectId);
  const selectedEffectClipId = useUi((s) => s.selectedEffectClipId);

  if (selectedFxObject?.kind === 'transition') {
    const hit = fxTarget(scenes, selectedFxObject.elementId);
    if (!hit) return null; // stale id — the store's scene-switch guard's twin
    const track = hit.scene.tracks.find((t) => t.elements.some((e) => e.id === hit.element.id));
    return (
      <TransitionSection
        els={[hit.element]}
        nextEl={track ? nextOnTrack(track.elements, hit.element) : null}
      />
    );
  }

  if (selectedFxObject?.kind === 'fade') {
    const side = selectedFxObject.side ?? 'in';
    const hit = fxTarget(scenes, selectedFxObject.elementId);
    if (!hit) return null;
    return <FadeSection el={hit.element} side={side} />;
  }

  /* clip mode — #105: the clip's EFFECT STACK (the Inspector's exact
     section, re-exported — no duplication); the effect domain survives only
     while this clip is the single selection (the store's own law). */
  if (selection.length > 1) {
    /* multi-selection: the aggregate law (the Inspector's own multi branch,
       cloned verbatim — a blank rail would be the dead surface the house
       law forbids; the count text is the honest state) */
    const total = scenes
      .find((sc) => sc.id === useUi.getState().activeSceneId)?.tracks
      .flatMap((t) => t.elements.filter((e) => selection.includes(e.id)))
      .reduce((n, e) => n + (e.effects?.length ?? 0), 0) ?? 0;
    return (
      <Group title="Effects">
        <p className="text-[11px] leading-relaxed text-tmuted">
          {selection.length} clips · {total} effects total.
          Effect stacks are per-clip — select a single clip to edit.
        </p>
      </Group>
    );
  }
  const clipId = selection.length === 1 ? selection[0] : null;
  if (clipId) {
    const hit = fxTarget(scenes, clipId);
    if (hit) {
      const selectedFxId = selectedEffectClipId === clipId ? selectedEffectId : null;
      return <EffectsSection el={hit.element} selectedFxId={selectedFxId} />;
    }
  }

  return null;
}

/* ---- the FX page's rail frame -------------------------------------------- */

export function FxInspector() {
  const selectedFxObject = useUi((s) => s.selectedFxObject);
  const selection = useUi((s) => s.selection);
  return (
    <div data-testid="shell-fxinspector" className="flex h-full w-full min-h-0 min-w-0 flex-col bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[11px] font-semibold text-tprimary">FX Inspector</span>
      </div>
      <div className="scroll-y min-h-0 flex-1" data-testid="shell-fxinspector-body">
        {selectedFxObject || selection.length > 0 ? (
          <FxInspectorSection />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center" data-testid="shell-fxinspector-state-empty">
            <span className="text-[12px] text-tmuted">Select a transition, fade, or clip</span>
            <span className="text-[10.5px] leading-relaxed text-tfaint">
              Seam zones add transitions · head/tail zones add fades · a clip shows its effect stack
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

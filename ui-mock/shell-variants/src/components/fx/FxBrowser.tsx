/* FxBrowser — R23-WA (DESIGN-R23 D-A5): the FX page's left dock. The
   LeftDock EffectsPanel EXTRACTED VERBATIM (R19 th_mtoyt5fv's copy of
   AppShell's original panel — the drag-to-clip contract
   application/x-nle-effect JSON {name, cat} is FROZEN, keys unchanged) and
   EXTENDED the legal way:
   - the cat vocabulary gains 'Fade' (D-A5: rows "Fade In/Out 0.5/1/2s" —
     the Clip drop parser routes them to setFade, NOT addEffectToElement —
     R23-B note 21: a fade is a model field, not a stack entry);
   - the Transition category carries ALL 27 registry presentations
     (TRANSITION_PRESENTATIONS — 'Fade In'/'Fade Out' the PRESENTATIONS stay
     transition rows; the clip fadeIn/fadeOut fields are a different domain,
     never conflated — Part IX ruling 6).
   Click = the honest drag-to-apply toast (the dual-route law, R14). */

import { Sparkles } from 'lucide-react';
import { useUi } from '../../state/useUiStore';
import { TRANSITION_PRESENTATIONS } from '../../lib/mockData';

/* ---------- the row registry ----------
   Shipped row set (byte-identical payload cats: 'Blur' | 'Stylize' |
   'Transition') + the 'Fade' rows. The visible sections follow D-A5's
   category names (Effects / Video Transitions / Fades); the PAYLOAD cat
   stays the frozen vocabulary. */
const EFFECT_ROWS = [
  { name: 'Gaussian Blur', cat: 'Blur' },
  { name: 'Motion Blur', cat: 'Blur' },
  { name: 'Vignette', cat: 'Stylize' },
  { name: 'Glow', cat: 'Stylize' },
  { name: 'Chromatic Aberration', cat: 'Stylize' },
];

const TRANSITION_ROWS = TRANSITION_PRESENTATIONS.map((name) => ({ name, cat: 'Transition' }));

/* D-A5: Fade In / Fade Out presets at 0.5 / 1 / 2 s — the row NAME carries
   the side + duration (the Clip drop parser reads it: "Fade In 1s"). */
const FADE_ROWS = [
  { name: 'Fade In 0.5s', cat: 'Fade' },
  { name: 'Fade In 1s', cat: 'Fade' },
  { name: 'Fade In 2s', cat: 'Fade' },
  { name: 'Fade Out 0.5s', cat: 'Fade' },
  { name: 'Fade Out 1s', cat: 'Fade' },
  { name: 'Fade Out 2s', cat: 'Fade' },
];

const SECTIONS: { label: string; rows: { name: string; cat: string }[] }[] = [
  { label: 'Effects', rows: EFFECT_ROWS },
  { label: 'Video Transitions', rows: TRANSITION_ROWS },
  { label: 'Fades', rows: FADE_ROWS },
];

/* drag-to-clip payload contract (spec 15 §5.4 drag-to-lane spirit): the
   timeline Clip drop target consumes this exact MIME type + JSON shape and
   applies the effect through addEffectToElement. FIXED CONTRACT — do not
   change the type string or the payload keys. */
const EFFECT_DRAG_TYPE = 'application/x-nle-effect';
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function FxBrowser() {
  const pushToast = useUi((s) => s.pushToast);
  return (
    /* fills the dock slot (the LeftDock mount keeps the same width law the
       pool occupies — one slot, one surface; FX page has no tab bar, #106) */
    <div data-testid="shell-fxbrowser" className="flex h-full min-h-0 w-full flex-col bg-shell">
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[11px] font-semibold text-tprimary">FX Browser</span>
      </div>
      <div className="scroll-y min-h-0 flex-1 p-1.5">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-tfaint">{section.label}</div>
            {section.rows.map((e) => (
              /* dual route (R14 no-op fix): DnD rows are the REAL apply path
                 (drag → Clip drop target / seam zone → setTransition /
                 setFade / addEffectToElement), while click is the honest
                 fallback for users who can't complete a drag — a toast
                 explains where the apply + param UI actually live. A button
                 element keeps the fallback keyboard-operable. */
              <button
                key={e.name}
                type="button"
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.setData(EFFECT_DRAG_TYPE, JSON.stringify({ name: e.name, cat: e.cat }));
                  ev.dataTransfer.effectAllowed = 'copy';
                  ev.dataTransfer.dropEffect = 'copy';
                }}
                onClick={() => pushToast({
                  kind: 'info',
                  title: `Add ${e.name}`,
                  detail: 'drag the row onto a timeline clip to apply (mock drag-to-clip, spec 15 §5.4); the FX inspector carries the param UI',
                })}
                data-testid={`shell-fxbrowser-row-${slug(e.name)}`}
                aria-label={`${e.cat === 'Transition' ? 'Transition' : e.cat === 'Fade' ? 'Fade preset' : 'Effect'} ${e.name}`}
                className="w-full cursor-grab rounded-[var(--radius)] border border-transparent px-2 py-1.5 text-left text-[11px] text-tmuted hover:border-soft hover:bg-[var(--hover-overlay)] hover:text-tprimary active:cursor-grabbing"
              >
                {e.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Storybook decorators + story helpers — shared by every *.stories.tsx file.
   Lives inside src/ so `tsc --noEmit` typechecks it (tsconfig includes src).

   The app's single Zustand store and VariantProvider are module-level singletons,
   so stories need containment:
   - withStoreReset (global, outermost): on every story switch it restores the
     pristine store snapshot captured ONCE at module load (before any story
     mutated anything), clears the variant/pool localStorage keys the app
     persists to, drops the #v=… location hash the provider mirrors, and
     defensively strips any variant data-attributes from documentElement (the
     provider itself only ever sets them on its own wrapper div, which unmounts
     with the story). Runs in the render phase before the new story tree mounts,
     so VariantProvider's loadVariant() sees clean storage, and it never
     re-runs mid-story — play()/interaction mutations survive until the next
     story switch, then get wiped.
   - withVariantProvider (global, inner): wraps every story in VariantProvider
     (leaf components — Timeline, Clip, variantHooks — call useVariant()).
     Storybook's react renderer keys the whole story tree by story id, so the
     provider remounts per story.

   Store-snapshot caveat: the pristine snapshot restores the top-level state
   (selection, panels, page, toasts, mixer, scenes…). The doc-mutation actions
   clone through withHistory() before mutating, so the captured scenes array
   stays pristine; the only deep-shared refs are nested arrays (element.effects,
   transitionOut) — stories here never mutate those programmatically, and
   interactions that do (effect toggles) are display-only for review.
   R15-A5: the story switch ALSO resets the shared metering engine (module
   singleton, see meterEngine.ts) — same containment contract as setup.ts. */

import { useLayoutEffect, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';
import { VariantProvider, useVariant } from '../components/debug/VariantProvider';
import { ConfirmProvider } from '../components/shell/ConfirmDialog';
import { DEFAULT_VARIANT, type Variant } from '../lib/variants';
import { useUi } from '../state/useUiStore';
import { __reset as resetMeterEngine, __setLevel } from '../lib/meterEngine';
import { ErrorBoundary } from '../components/shell/ErrorBoundary';
import { DebugOverlay } from '../components/debug/DebugOverlay';
import { CheatSheet } from '../components/shell/CheatSheet';
import { AppShell } from '../components/shell/AppShell';

/* ---- store snapshot + reset ------------------------------------------------ */

/** Pristine state, captured at module load — before any story rendered. */
const pristine = useUi.getState();

/** LocalStorage keys the app writes (variant share-links + media-pool prefs). */
const LS_KEYS = ['nle-shell-variants:v1', 'nle-mock-pool-prefs'];

/** Variant data-attributes — defensively stripped from <html> on story switch. */
const DOC_ATTRS = ['data-theme', 'data-density', 'data-clipstyle', 'data-accent', 'data-headerstyle', 'data-variant'];

let lastStoryId: string | undefined;

export const withStoreReset: Decorator = (Story, context) => {
  if (lastStoryId !== context.id) {
    lastStoryId = context.id;
    useUi.setState(pristine, true); // replace semantics — full re-hydration
    // R15-A2 engine containment (mirrors setup.ts afterEach): meterEngine is
    // module-level too, and __setLevel overrides on store-backed keys
    // (track ids / master) would otherwise leak into every later story —
    // reset to a silent, stopped, key-less engine before the tree mounts.
    resetMeterEngine();
    for (const key of LS_KEYS) {
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    }
    try {
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    } catch { /* history unavailable */ }
    for (const attr of DOC_ATTRS) document.documentElement.removeAttribute(attr);
  }
  return <Story />;
};

export const withVariantProvider: Decorator = (Story) => (
  <VariantProvider>
    {/* ConfirmProvider mirrors the real app: AppShell mounts it around the
        shell tree, and Clip/SceneTabs call useConfirm() unconditionally —
        stories that render those leaves need it too. */}
    <ConfirmProvider>
      <Story />
    </ConfirmProvider>
  </VariantProvider>
);

/* ---- per-story boots ------------------------------------------------------- */

/** Partial view-state patch for StoreBoot (UiState isn't exported from the
    shared store file — derived from the hook instead of redeclaring it). */
export type UiPatch = Partial<ReturnType<typeof useUi.getState>>;

/** Applies a store patch before first paint (layout effect) so the story
 *  renders its target state with no default-state flash. Mount-only: the
 *  withStoreReset decorator guarantees a fresh store per story. */
export function StoreBoot({ patch }: { patch?: UiPatch }) {
  useLayoutEffect(() => {
    if (patch) useUi.setState(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  }, []);
  return null;
}

/** Forces the variant dimensions for a story before first paint. setVariant
 *  persists to localStorage/hash; the global reset wipes that on the next
 *  story switch, so variants never leak between stories. */
export function VariantBoot({ variant }: { variant: Variant }) {
  const { setVariant } = useVariant();
  useLayoutEffect(() => {
    setVariant(variant);
  }, [setVariant, variant]);
  return null;
}

/** R15-A5 deterministic meter levels for a story: applies the engine's
 *  `__setLevel` debug hook (bypasses the seeded program sim + the playing
 *  gate, respects effectiveMuted, applies synchronously) on mount and
 *  re-arms every 900 ms so the transient hold states stay reviewable — the
 *  peak line holds 1 s and the clip latch 2 s, then decays; fixed values,
 *  no randomness. The `levels` array is applied IN ORDER each arm: two
 *  entries on one key are the peak idiom (set the high value, then the lower
 *  display value — the first sets the held peak, the second the fill).
 *  Layout-effect sibling ordering: render <StoreBoot /> BEFORE this so the
 *  engine's world read (muted/solo) sees the patched store. Pass a
 *  module-level constant so the effect never re-fires. */
export function MeterLevels({ levels }: { levels: { key: string; db: number; channel?: 'l' | 'r' }[] }) {
  useLayoutEffect(() => {
    const apply = () => {
      for (const l of levels) __setLevel(l.key, l.db, l.channel);
    };
    apply();
    const t = window.setInterval(apply, 900);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design (constant levels)
  }, [levels]);
  return null;
}

/* ---- story scaffolding ----------------------------------------------------- */

/** A full-shell story: VariantProvider comes from the global decorator; this
 *  composes the App.tsx arrangement minus the window-too-small overlay (that
 *  one is a CSS media-query gate — not meaningfully previewable as a story)
 *  plus the per-story store/variant boots. */
export function FullShell({ variant = DEFAULT_VARIANT, patch }: { variant?: Variant; patch?: UiPatch }) {
  return (
    <>
      <StoreBoot patch={patch} />
      <VariantBoot variant={variant} />
      <ErrorBoundary>
        {/* spec 18 §6.4 — boundary wraps only the shell tree, like App.tsx */}
        <div className="h-screen w-screen overflow-hidden">
          <AppShell />
        </div>
      </ErrorBoundary>
      <DebugOverlay />
      <CheatSheet />
    </>
  );
}

/** Fixed-size panel box for component-solo stories (the panels are sized by
 *  the shell's splitters in the real app — mock the geometry here). */
export function PanelBox({ width, height, children }: { width: number; height?: number; children: ReactNode }) {
  return (
    <div
      className="panel-shadow overflow-hidden bg-shell"
      style={{ width, height, minHeight: height ?? 600, maxHeight: height ?? 800 }}
    >
      {children}
    </div>
  );
}

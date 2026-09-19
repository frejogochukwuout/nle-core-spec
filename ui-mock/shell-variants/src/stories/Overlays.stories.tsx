/* Overlay-region stories — the §6.4 surfaces that float above the shell tree:
   the destructive confirm dialog, the global error boundary's crash fallback,
   the ctrl+` Variant Explorer, and the toast region's error/persist kinds plus
   the max-3 cap. None of these need the full shell: the confirm dialog and
   explorer are context-provider state (the global withVariantProvider decorator
   already mounts ConfirmProvider + VariantProvider around every story), and the
   boundary/toast states boot straight from the store. */

import { useEffect, useLayoutEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useConfirm, type ConfirmOptions } from '../components/shell/ConfirmDialog';
import { ErrorBoundary } from '../components/shell/ErrorBoundary';
import { DebugOverlay } from '../components/debug/DebugOverlay';
import { useVariant } from '../components/debug/VariantProvider';
import { ToastRegion } from '../components/shell/ToastRegion';
import { useUi, type Toast } from '../state/useUiStore';
import { StoreBoot } from './decorators';

const meta: Meta = {
  title: 'Overlays',
};

export default meta;

/* ---- confirm dialog (spec 18 §6.4) ----------------------------------------
   The dialog is ConfirmProvider-local state, NOT store state. The global
   withVariantProvider decorator already mounts the provider, so the harness
   below calls the same useConfirm() fn SceneTabs / the clip menu call and
   auto-opens the target variant before first paint; the two trigger buttons
   re-open it after Esc / ⌘. / backdrop-click cancel. onConfirm is wired to the
   real store actions, so confirming runs the honest mock command. */

/** SceneTabs' exact request for the non-active scene ("Interview selects" —
 *  6 clips), computed from the live store like closeScene() does. */
function sceneDeleteRequest(): ConfirmOptions {
  const s = useUi.getState();
  const sc = s.scenes.find((x) => x.id !== s.activeSceneId) ?? s.scenes[0];
  const clips = sc.tracks.reduce((n, t) => n + t.elements.length, 0);
  return {
    title: `Delete scene ${sc.name}?`,
    body: `${clips} clip${clips === 1 ? '' : 's'} will be lost. Undo can restore the scene.`,
    confirmLabel: 'Delete scene',
    danger: true,
    onConfirm: () => s.deleteScene(sc.id),
  };
}

/** The clip menu's ≥ 5 multi-delete request over 6 of scene 1's 7 elements. */
const MULTI_IDS = ['el-1', 'el-2', 'el-3', 'el-4', 'el-5', 'el-7'];
function multiDeleteRequest(): ConfirmOptions {
  return {
    title: `Delete ${MULTI_IDS.length} clips?`,
    body: `${MULTI_IDS.length} selected elements will be removed from the timeline. Undo can restore them.`,
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: () => useUi.getState().deleteElements(MULTI_IDS, false),
  };
}

/** Story-side trigger surface: auto-opens one variant before first paint
 *  (keyed on the stable variant discriminator, never re-fires on re-render)
 *  and keeps both buttons live for re-review after a cancel. */
function ConfirmStory({ variant }: { variant: 'scene' | 'multi' }) {
  const confirm = useConfirm();
  useLayoutEffect(() => {
    confirm(variant === 'scene' ? sceneDeleteRequest() : multiDeleteRequest());
  }, [confirm, variant]);
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-app px-8 text-center">
      <p className="max-w-[540px] text-[12px] leading-snug text-tmuted">
        §6.4 destructive confirm, mounted by the same ConfirmProvider the shell uses —
        Esc / ⌘. and backdrop-click cancel, Tab is trapped between the two buttons, and
        the confirm button takes focus on open. The buttons below re-open each variant.
      </p>
      <div className="flex gap-2">
        <button type="button" className="confirm-btn danger" onClick={() => confirm(sceneDeleteRequest())}>
          Delete scene “Interview selects”
        </button>
        <button type="button" className="confirm-btn danger" onClick={() => confirm(multiDeleteRequest())}>
          Delete 6 clips
        </button>
      </div>
    </div>
  );
}

/** Scene-delete variant, auto-open: danger-red confirm label, clip-loss count
 *  in the body, alertdialog + focus-trap semantics, blurred backdrop. */
export const ConfirmSceneDelete: StoryObj = {
  name: 'Confirm dialog — scene delete (open)',
  parameters: { layout: 'fullscreen' },
  render: () => <ConfirmStory variant="scene" />,
};

/** Multi-delete variant (6 selected ≥ the §6.4 threshold of 5), auto-open:
 *  same danger treatment with the timeline-flavored body copy. */
export const ConfirmMultiDelete: StoryObj = {
  name: 'Confirm dialog — multi-delete 6 clips (open)',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot patch={{ selection: MULTI_IDS }} />
      <ConfirmStory variant="multi" />
    </>
  ),
};

/* ---- error boundary (spec 18 §6.4 last resort) ---------------------------- */

/** Classic Bomb — throws during render, like a lane crashing while painting. */
function Bomb(): never {
  throw new Error('Mock render crash — timeline lane threw while painting “sunset_timelapse”');
}

/** The §6.4 failure fallback: role=alert panel, diagnostics block (error +
 *  component stack), Reload + Copy diagnostics. The stand-in content proves
 *  the boundary replaces the whole shell tree, not just the crashed child. */
export const ErrorBoundaryCrash: StoryObj = {
  name: 'Error boundary — crash fallback',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="h-screen w-full bg-app">
      <ErrorBoundary>
        <div className="mono flex h-full items-center justify-center text-[11px] text-tmuted">
          ( shell tree renders here until a child throws )
        </div>
        <Bomb />
      </ErrorBoundary>
    </div>
  ),
};

/* ---- variant explorer (ctrl+` debug overlay) ------------------------------
   overlayOpen is VariantProvider-local state (not store, not persisted); the
   harness flips it through the same setOverlayOpen the keybinding and the
   bottom-right pill drive, before first paint. */

function OverlayOpenBoot() {
  const { setOverlayOpen } = useVariant();
  useLayoutEffect(() => {
    setOverlayOpen(true);
  }, [setOverlayOpen]);
  return null;
}

/** The explorer OPEN state: preset list, the five dimension segments, toast
 *  test row, spec-position note, share-link + reset. Esc closes it; the
 *  bottom-right pill re-opens. */
export const VariantExplorerOpen: StoryObj = {
  name: 'Variant explorer — open',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot />
      <OverlayOpenBoot />
      <div className="h-screen w-full bg-app">
        <DebugOverlay />
      </div>
    </>
  ),
};

/* ---- toast region — remaining kinds + the max-3 cap -----------------
   Kind machine: info/success 4 s, persist (warning-class) 6 s, error has no
   timer. DEVIATION, honestly labeled: spec 18 §6.4 says the stack caps at 3
   with the OLDEST COLLAPSING TO AN ICON ROW — the mock's pushToast DROPS the
   oldest instead (registered as a seal item). This story shows the mock's
   actual behavior, not the spec's. */

/** Booted stack, oldest→newest like pushToast appends: the persist card rides
 *  the 6 s warning-class timer; the error card has no timer and stays. */
const BOOT_TOASTS: Toast[] = [
  { id: 901, kind: 'persist', title: 'Renderer updated', detail: 'warning-class — auto-dismisses at 6 s (§6.4)' },
  { id: 902, kind: 'error', title: 'Media offline — waves_closeup.mp4', detail: 'role="alert" · no timer, dismiss manually' },
];

/** The two kinds the other toast story doesn't show: red danger rail +
 *  role=alert (error, persistent) vs amber warning rail + 6 s auto-dismiss
 *  (persist, warning-class). */
export const ToastErrorAndPersist: StoryObj = {
  name: 'Toast region — error + persist kinds',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <>
      <StoreBoot patch={{ toasts: BOOT_TOASTS }} />
      <div className="h-screen w-full bg-app">
        <ToastRegion />
      </div>
    </>
  ),
};

/** Max-3 stack cap demo (MOCK DEVIATION from §6.4 — registered): four
 *  error-kind toasts pushed on mount — the store DROPS the oldest (the spec
 *  would collapse it to an icon row), so “Render job 1” never renders. */
function ToastStackScenario() {
  useEffect(() => {
    const s = useUi.getState();
    for (let n = 1; n <= 4; n++) {
      s.pushToast({
        kind: 'error',
        title: `Render job ${n} failed`,
        detail: n === 1 ? 'pushed first — dropped by the max-3 cap (mock drops; §6.4 spec: collapse to icon row)' : 'kept — the newest three only',
      });
    }
  }, []);
  return (
    <>
      <StoreBoot />
      <div className="h-screen w-full bg-app">
        <ToastRegion />
      </div>
    </>
  );
}

/** Max-3 stack, settled: error kind has no timer, so the capped three-card
 *  stack stays on screen; bottom card = newest (owns testid index 0). */
export const ToastMaxStack: StoryObj = {
  name: 'Toast region — max-3 stack (oldest dropped)',
  parameters: { layout: 'fullscreen' },
  render: () => <ToastStackScenario />,
};

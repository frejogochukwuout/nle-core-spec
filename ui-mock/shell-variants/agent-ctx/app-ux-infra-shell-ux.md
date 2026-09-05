# Task: app-ux-infra — context menus (18 §4.9), toasts/confirm/boundary (18 §6.4)

Agent: shell-ux
Scope: /home/z/nle-core-spec/ui-mock/shell-variants
Status: complete — `npx tsc --noEmit` exit 0.

## Files created
- `src/components/shell/ContextMenu.tsx` — reusable menu + `useContextMenu()` +
  `isMenuKey()` (Shift+F10 / ContextMenu key). 220px, 28px items, token-styled,
  viewport-clamped, transparent-overlay dismiss (click/wheel/right-click),
  arrows/Enter/Esc (all keydowns stopPropagation'd so spec-16 shortcuts stay out),
  focus returns to opener, one-menu-at-a-time. MenuItem extras: `sep`, `tip`
  (data-tip), `checked` (menuitemcheckbox), `custom` (row owned by host).
  testids: named → `shell-menu-<name>` + `shell-menu-<name>-<item>` (spec §10);
  unnamed → `shell-menu` + `shell-menu-item-<id>`. **MediaPool agent: consume
  this API — do not fork a second menu.**
- `src/components/shell/ToastRegion.tsx` — bottom-right, above status strip+dock;
  role status (info/success/persist) / alert (error); info 4s, success 4s,
  persist 6s (warning-class), error no timer (until dismissed); `shell-toast-<n>` bottom-up (newest=0);
  Info/CheckCircle2/TriangleAlert 14px sw1.6; 200ms slide-in.
- `src/components/shell/ConfirmDialog.tsx` — `ConfirmProvider` + `useConfirm()`:
  `confirm({title, body, confirmLabel, danger, onConfirm})`; alertdialog,
  aria-modal, confirm button focused on open, Esc + ⌘. cancel, 2-stop Tab trap,
  backdrop-click cancel; testids `shell-confirm[-confirm|-cancel]`.
- `src/components/shell/ErrorBoundary.tsx` — class boundary; "Something went
  wrong" + Reload + Copy diagnostics (clipboard try/catch → toast + inline
  status, since ToastRegion dies with the tree). `shell-failure-boundary`.

## Files edited (surgical)
- `app.css` — appended `@layer components`: .menu-pop/.menu-item/.menu-sep/
  .menu-row/.menu-dot/.toast-*/.confirm-* + menu-in/toast-in keyframes
  (killed by the existing prefers-reduced-motion rule).
- `Clip.tsx` — clip menu (`shell-menu-clip-*`): open-in-viewer toast, split
  ⌘B (fan-out over selection; real = batched), duplicate ⌘D, delete ⌫ /
  ripple-delete ⇧⌫ (danger; ≥5 targets → confirm "Delete N clips?"),
  detach-audio disabled+tip, Properties (setInspectorTab('video') + F6-region
  focus, ensures panel+edit page), mix-track toast. Clip is a roving focus
  host (tabIndex -1, focus on pointerdown) for Shift+F10.
- `TrackHeader.tsx` — track menu (`shell-menu-track-*`): add track (same kind),
  rename disabled+tip, mute/solo/lock checked toggles (module toggleTrack),
  delete-track danger+disabled "mock: needs deleteTrack command".
- `Ruler.tsx` — ruler menu (`shell-menu-ruler-*`): add marker at playhead,
  clear in/out, loop playback (checked), 8-dot color palette row (dots add
  colored markers; Left/Right cycles dots). Right-button pointerdown no longer
  seeks. Ruler focusable (tabIndex -1) + focus on click.
- `Timeline.tsx` — timeline-empty menu (`shell-menu-timeline-empty-*`) on the
  scroll surface: paste disabled+tip, add marker, add track (audio), load
  sample project + success toast. Roving focus on empty-lane clicks.
- `SceneTabs.tsx` — close-tab wired: clips>0 → confirm "Delete scene N? M clips
  will be lost"; empty → direct deleteScene; last scene → info toast.
- `AppShell.tsx` — +`<ConfirmProvider>` wrap, +`<ToastRegion />` before the
  closing div, +`useBeforeUnloadGuard()` (dirty = past.length > 0, commented;
  scene.dirty NOT counted — seeded display state would prompt on a fresh load).
- `App.tsx` — `<ErrorBoundary>` wraps `<AppShell/>` only (debug overlay +
  cheat sheet stay alive post-crash).
- `DebugOverlay.tsx` — tiny 3-button "Toast test" row (info/success/error).

## Honest mocks / skipped
- DeliverPage render-job cancel confirm: **skipped** — the file has no cancel
  control to wire (running jobs only expose Retry). Confirm consumers shipped:
  SceneTabs delete + clip-menu multi-delete.
- Store has no deleteTrack → track menu Delete disabled with tooltip (task rule).
- Paste / Rename / Detach audio disabled with data-tip mock notes.
- SceneTabs "+" (createScene) left unwired — outside menu/confirm scope.
- Untouched (per rules): useUiStore.ts, MediaPool.tsx, Viewer, Inspector,
  CheatSheet, useShortcuts/shortcutMap.

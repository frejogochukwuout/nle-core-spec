# Task: MediaPool completeness (spec 18 §4.2 + §4.10)

Agent: mediapool-completeness agent
Scope: /home/z/nle-core-spec/ui-mock/shell-variants
(Prior records in agent-ctx/ read: inspector-completeness-inspector.md, app-ux-infra-shell-ux.md — no file collisions.)

## Files changed
- `src/components/shell/MediaPool.tsx` — full rewrite (~700 lines). Exports the
  shared drag contract consumed by the timeline: `POOL_DRAG_TYPE`
  ('application/x-nle-media') + `isDroppable(kind, mediaType)`.
- `src/components/timeline/Timeline.tsx` — MINIMAL additions only: lane divs got
  `onDragOver/onDragLeave/onDrop` + a `pool-lane-ok|bad` highlight class + cursor
  in the existing inline style; one new store hook (`mediaDrag`), two new imports.
  Marquee/wheel/menu code untouched.
- `src/styles/app.css` — appended one `@layer components` block (`.skel`,
  `.pool-drop-overlay`, `.pool-drag-ghost`, `.pool-lane-ok/-bad`) + `@keyframes
  skel-pulse` (1 Hz; global prefers-reduced-motion rule zeroes it). No collisions.

## §4.2 contract — honored vs mock-only
Honored: header Import button + whole-body file drag-drop target (dashed-accent
overlay) + ⌘I hint (global shortcut pre-exists); card anatomy (thumb, name, TC
duration, V/A/I badge, resolution, fps≠project badge); grid/list view toggle;
4 sort modes × asc/desc persisted under ONE localStorage key
`nle-mock-pool-prefs` (hydrated on mount ONLY when store still defaults,
defensive try/catch); 200ms-debounced search + clear ×; single/⌘-additive/
Shift-range selection (anchor = last single click) over flat filtered order;
`aria-multiselectable` listbox + `aria-activedescendant` + arrow/Enter/Space
handling with local stopPropagation (global spec-16 layer untouched);
drag-to-lane ghost (thumbnail+name, 50%, `pool-drag-ghost` testid) following the
pointer via window-capture dragover; copy/not-allowed cursor (dropEffect) +
hovered-lane highlight; dbl-click reveal (setPlayhead to first use; toast when
asset unused in active scene); §4.9 context menu (Reveal/Copy/Move to…
disabled/Remove danger) on right-click AND Shift+F10; offline badge + red left
stripe (card + row); state rows loading (6-skel, 900ms first mount only) /
empty (CTA + Load sample project §4.10) / no-result (kept testid); footer
aria-live live counts (n clips · m selected · M:SS total · fps).

Mock-only (honest toasts, no store action exists): import pipeline (no probe/
persistBlob), drop commit ("Placed <name> on <badge>" — no insertElement),
Copy clipboard, Move to…, Remove-from-pool actual store removal (component-local
removedIds; blocked with "In use by N clips" error when any scene references).
Empty state reachable only after removing all unused assets (m-04/m-08);
Load-sample from empty restores the pool.

## Drag rule (per task)
video→main; image→overlay; audio→audio; locked tracks reject; else not-allowed.

## Status
- `npx tsc --noEmit` → clean (exit 0). No tests written (per task rules).
- testids kept/added: shell-mediapool, shell-mediapool-card,
  shell-mediapool-state-{empty,loading,noresult}, pool-drag-ghost,
  shell-menu-mediapool-{reveal,copy,moveto,remove}.

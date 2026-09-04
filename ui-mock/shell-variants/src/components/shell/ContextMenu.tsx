/* ContextMenu — spec 18 §4.9 menu chrome: DOM popup, 220px, 28px items,
   shortcut labels right-aligned, separators between groups, Esc / outside
   click closes, focus returns to the opener. Both §4.9 routes are exposed:
   right-click (onContextMenu + preventDefault) and the normative keyboard
   route Shift+F10 / ContextMenu key with focus in the surface (§11) —
   hosts call `menu.open(...)` from onContextMenu and
   `menu.openForElement(...)` from onKeyDown when `isMenuKey(e)` matches.
   testids: root `shell-menu[-<name>]`, items `shell-menu[-<name>]-<item>`
   (spec 18 §10: `shell-menu-<name>[-<item>]`); with no `name` the generic
   form `shell-menu` / `shell-menu-item-<id>` is used. */

import React, { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  id: string;
  label?: string;          // omitted when `custom` supplies the whole row
  shortcut?: string;       // right-aligned shortcut label (display only)
  danger?: boolean;        // destructive styling (var(--danger))
  disabled?: boolean;      // §9 disabled language: 40% + not-allowed, no focus stop
  tip?: string;            // data-tip — honest-mock explanations on hover
  checked?: boolean;       // renders as role="menuitemcheckbox" with a tick
  sep?: boolean;           // hairline separator ABOVE this item (group break)
  custom?: ReactNode;      // fully custom row body (rendered role="group",
                           // owns its own activation + menu.close())
  onSelect?: () => void;   // fires after the menu has closed
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
  name?: string;
}

/** True for the §4.9 keyboard routes: Shift+F10 and the ContextMenu key. */
export function isMenuKey(e: { key: string; shiftKey?: boolean }): boolean {
  return (e.key === 'F10' && e.shiftKey === true) || e.key === 'ContextMenu';
}

/* one menu open at a time (§4.9) — the latest opener closes the previous */
let closeActiveMenu: (() => void) | null = null;

/** Per-host menu state manager. The host renders
 *  `{menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}`. */
export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const openRef = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (!openRef.current) return; // idempotent — no focus steal on stale calls
    openRef.current = false;
    if (closeActiveMenu === close) closeActiveMenu = null;
    setState(null);
    // §4.9: focus returns to the opener
    const opener = openerRef.current;
    openerRef.current = null;
    opener?.focus?.();
  }, []);

  const open = useCallback(
    (x: number, y: number, items: MenuItem[], name?: string) => {
      const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (closeActiveMenu && closeActiveMenu !== close) closeActiveMenu();
      openRef.current = true;
      closeActiveMenu = close;
      openerRef.current = opener;
      setState({ x, y, items, name });
    },
    [close],
  );

  /** Keyboard-route placement: pop below the focused host's top-left. */
  const openForElement = useCallback(
    (el: HTMLElement | null, items: MenuItem[], name?: string) => {
      const r = el?.getBoundingClientRect();
      if (!r) { open(120, 120, items, name); return; }
      open(r.left + 14, r.bottom + 2, items, name);
    },
    [open],
  );

  return { state, open, openForElement, close };
}

interface ContextMenuProps extends ContextMenuState {
  onClose: () => void;
}

export function ContextMenu({ x, y, items, name, onClose }: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const base = name ? `shell-menu-${name}` : 'shell-menu';
  const itemTid = (id: string) => (name ? `${base}-${id}` : `${base}-item-${id}`);

  /* roving candidates in DOM order: every menuitem descendant — command
     items AND the focusable children custom rows render (MenuItem.custom is
     arbitrary ReactNode, e.g. the ruler's 8-color palette dots). Disabled
     command items are skipped (§9 aria-disabled, no focus stop). */
  const rovingItems = () =>
    Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      ) ?? [],
    ).filter((el) => el.getAttribute('aria-disabled') !== 'true');

  /* clamp to viewport once measured + focus the first enabled item */
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setPos({
      left: Math.max(4, Math.min(x, window.innerWidth - el.offsetWidth - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - el.offsetHeight - 4)),
    });
    const first = rovingItems()[0];
    if (first) first.focus();
    else el.focus();
  }, [x, y, items]);

  const select = (it: MenuItem) => {
    if (it.disabled) return;
    onClose(); // §4.9: close + focus back to opener, then dispatch
    it.onSelect?.();
  };

  /* roving arrows over the DOM-order menuitem list (custom-row children
     included); skip-disabled + wrap preserved. Custom rows may keep their own
     Left/Right handling (events bubble up to this handler otherwise);
     stopPropagation keeps every shell shortcut (spec 16) out while open */
  const onKeydown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const dir: 1 | -1 = e.key === 'ArrowDown' ? 1 : -1;
      const eligible = rovingItems();
      if (eligible.length === 0) return;
      const cur = eligible.findIndex((m) => m === document.activeElement);
      const next = cur === -1
        ? (dir === 1 ? 0 : eligible.length - 1)
        : (dir === 1 ? (cur + 1) % eligible.length : (cur - 1 + eligible.length) % eligible.length);
      eligible[next].focus();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault(); // menus are not tab stops; Tab dismisses
      onClose();
    }
    /* Enter/Space activate the focused item natively (button semantics) */
  };

  return (
    <>
      {/* transparent overlay — click / scroll / right-click closes; no dark
          backdrop (§4.9: menus float over the unobstructed app) */}
      <div
        className="fixed inset-0 z-[92]"
        aria-hidden="true"
        onPointerDown={() => onClose()}
        onWheel={() => onClose()}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        ref={rootRef}
        role="menu"
        aria-label={name ? `${name} context menu` : 'Context menu'}
        tabIndex={-1}
        data-testid={base}
        className="menu-pop"
        style={pos}
        onKeyDown={onKeydown}
      >
        {items.map((it) => (
          <React.Fragment key={it.id}>
            {it.sep && <div className="menu-sep" role="separator" aria-orientation="horizontal" />}
            {it.custom ? (
              <div className="menu-row" role="group" aria-label={it.label}>
                {it.custom}
              </div>
            ) : (
              <button
                type="button"
                role={it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
                aria-checked={it.checked}
                aria-disabled={it.disabled || undefined}
                data-testid={itemTid(it.id)}
                data-tip={it.tip}
                className={`menu-item${it.danger ? ' is-danger' : ''}`}
                /* aria-disabled (not native disabled) so the honest-mock
                   data-tip still hovers — same trick as .mini-btn */
                onMouseDown={(e) => { if (it.disabled) e.preventDefault(); }}
                onClick={() => select(it)}
              >
                {it.checked !== undefined && (
                  <span className="menu-check mono" aria-hidden="true">{it.checked ? '✓' : ''}</span>
                )}
                <span className="min-w-0 flex-1 truncate text-left">{it.label}</span>
                {it.shortcut && <span className="menu-sc mono">{it.shortcut}</span>}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

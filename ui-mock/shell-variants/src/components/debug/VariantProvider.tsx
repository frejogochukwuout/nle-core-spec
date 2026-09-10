/* VariantProvider — holds the active variant, applies data-attributes to the
   shell root (tokens re-skin everything), listens for ctrl+` / cmd+`,
   persists to localStorage and mirrors into location.hash for share links. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_VARIANT, loadVariant, saveVariant, serializeVariant,
  type Variant,
} from '../../lib/variants';

interface VariantCtx {
  variant: Variant;
  setVariant: (v: Variant | ((prev: Variant) => Variant)) => void;
  overlayOpen: boolean;
  setOverlayOpen: (open: boolean) => void;
}

const Ctx = createContext<VariantCtx | null>(null);

export function VariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<Variant>(() => loadVariant());
  const [overlayOpen, setOverlayOpen] = useState(false);

  const setVariant = useCallback((v: Variant | ((prev: Variant) => Variant)) => {
    setVariantState((prev) => {
      const next = typeof v === 'function' ? (v as (p: Variant) => Variant)(prev) : v;
      saveVariant(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ctrl+` / cmd+` toggles the debug overlay (user-specified binding)
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOverlayOpen((o) => !o);
      }
      // Esc closes overlay
      if (e.key === 'Escape') setOverlayOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<VariantCtx>(
    () => ({ variant, setVariant, overlayOpen, setOverlayOpen }),
    [variant, setVariant, overlayOpen],
  );

  return (
    <Ctx.Provider value={value}>
      <div
        data-theme={variant.theme}
        data-density={variant.density}
        data-clipstyle={variant.clipStyle}
        data-accent={variant.accent}
        data-headerstyle={variant.headerStyle}
        data-variant={serializeVariant(variant)}
        className="h-full w-full bg-shell text-tprimary"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useVariant(): VariantCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVariant outside VariantProvider');
  return ctx;
}

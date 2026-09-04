/* DebugOverlay — ctrl+` (or the pill button) opens this floating panel.
   Presets A/B/C pick a curated direction; each dimension can then be toggled
   independently. Share-link copies a URL that restores the current variant. */

import { useState } from 'react';
import { useVariant } from './VariantProvider';
import { DEFAULT_VARIANT, PRESETS, serializeVariant, type Accent, type ClipStyle, type Density, type HeaderStyle, type Theme, type Variant } from '../../lib/variants';
import { useUi } from '../../state/useUiStore';
import { ChevronDown, Copy, Check, RotateCcw, Keyboard, X, SlidersHorizontal } from 'lucide-react';

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          data-tip={o.hint}
          className={`flex-1 rounded-[var(--radius)] border px-2 py-[5px] text-[11px] transition-colors ${
            value === o.v
              ? 'border-accent bg-accent/15 text-tprimary'
              : 'border-soft text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-tfaint">{label}</div>
      {children}
    </div>
  );
}

export function DebugOverlay() {
  const { variant, setVariant, overlayOpen, setOverlayOpen } = useVariant();
  const [copied, setCopied] = useState(false);
  const pushToast = useUi((s) => s.pushToast);
  if (!overlayOpen) {
    return (
      <button
        onClick={() => setOverlayOpen(true)}
        data-tip="Variant Explorer — Ctrl + `"
        data-tip-top
        aria-label="Open variant explorer"
        className="fixed bottom-3 right-3 z-[80] flex items-center gap-1.5 rounded-full border border-soft bg-inset/90 px-3 py-1.5 text-[11px] text-tmuted opacity-40 backdrop-blur transition-opacity hover:opacity-100"
      >
        <SlidersHorizontal size={12} />
        <span className="mono">Ctrl `</span>
      </button>
    );
  }

  const presetMatch = PRESETS.find((p) => serializeVariant(p.variant) === serializeVariant(variant));
  const activePreset = PRESETS.find((p) => p.id === (presetMatch?.id ?? 'A'));

  const share = () => {
    const url = `${location.origin}${location.pathname}#v=${encodeURIComponent(serializeVariant(variant))}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      role="dialog"
      aria-label="Variant explorer"
      className="fixed right-3 top-12 z-[80] w-[320px] overflow-hidden rounded-lg border border-strong bg-panel/95 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-2 border-b border-hairline bg-raised px-3 py-2">
        <SlidersHorizontal size={13} className="text-accent" />
        <span className="text-[12px] font-semibold text-tprimary">Variant Explorer</span>
        <span className="mono rounded border border-soft px-1.5 py-0.5 text-[11px] text-tfaint">Ctrl `</span>
        <div className="grow" />
        <button onClick={() => setOverlayOpen(false)} aria-label="Close variant explorer" className="icon-btn !h-6 !w-6">
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        {/* presets */}
        <Row label="Direction presets">
          <div className="flex flex-col gap-1">
            {PRESETS.map((p) => {
              const active = presetMatch?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setVariant(p.variant)}
                  className={`flex items-start gap-2.5 rounded-[var(--radius)] border px-2.5 py-2 text-left transition-colors ${
                    active ? 'border-accent bg-accent/10' : 'border-soft hover:bg-[var(--hover-overlay)]'
                  }`}
                >
                  <span className={`mono mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold ${active ? 'border-accent text-accent' : 'border-soft text-tmuted'}`}>
                    {p.id}
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold text-tprimary">{p.name}</span>
                    <span className="block text-[11px] leading-tight text-tmuted">{p.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Row>

        {/* dimensions */}
        <Row label="Theme">
          <Seg<Theme>
            value={variant.theme}
            onChange={(theme) => setVariant((v) => ({ ...v, theme }))}
            options={[
              { v: 'resolve', label: 'Resolve', hint: 'spec 18 §9 canon' },
              { v: 'studio', label: 'Studio', hint: 'elevated modern dark' },
              { v: 'light', label: 'Light', hint: 'exploratory — rejected in 18 §8.14' },
            ]}
          />
        </Row>
        <Row label="Density">
          <Seg<Density>
            value={variant.density}
            onChange={(density) => setVariant((v) => ({ ...v, density }))}
            options={[
              { v: 'pro', label: 'Pro', hint: '34px bars / 24px controls (spec)' },
              { v: 'comfortable', label: 'Comfortable', hint: '40px bars / 28px controls' },
            ]}
          />
        </Row>
        <Row label="Clip rendering">
          <Seg<ClipStyle>
            value={variant.clipStyle}
            onChange={(clipStyle) => setVariant((v) => ({ ...v, clipStyle }))}
            options={[
              { v: 'filmstrip', label: 'Filmstrip', hint: 'spec 05 §7 — thumbs + waveforms, 80/60px lanes' },
              { v: 'blocks', label: 'Blocks', hint: 'davinci mock — compact solid clips' },
            ]}
          />
        </Row>
        <Row label="Accent">
          <Seg<Accent>
            value={variant.accent}
            onChange={(accent) => setVariant((v) => ({ ...v, accent }))}
            options={[
              { v: 'gold', label: 'Gold', hint: '#e8b34b — spec 18 token' },
              { v: 'ember', label: 'Ember', hint: '#fa6a4a — mock-authentic orange' },
              { v: 'violet', label: 'Violet', hint: '#7b5cff — mock gradient start' },
            ]}
          />
        </Row>
        <Row label="Track headers">
          <Seg<HeaderStyle>
            value={variant.headerStyle}
            onChange={(headerStyle) => setVariant((v) => ({ ...v, headerStyle }))}
            options={[
              { v: 'readout', label: '160px + TC', hint: 'shell-canonical (18 §3.1)' },
              { v: 'slim', label: '112px slim', hint: 'OpenCut teacher value (05 §10 note)' },
            ]}
          />
        </Row>

        {/* toast test — §6.4 notification region driver (info 4 s / success 6 s /
            error persists; max-3 stack enforced by the store) */}
        <Row label="Toast test">
          <div className="flex gap-1">
            {([
              { kind: 'info', label: 'Info', title: 'Info toast', detail: 'auto-dismisses in 4 s' },
              { kind: 'success', label: 'Success', title: 'Success toast', detail: 'auto-dismisses in 6 s' },
              { kind: 'error', label: 'Error', title: 'Error toast', detail: 'persists until dismissed' },
            ] as const).map((t) => (
              <button
                key={t.kind}
                onClick={() => pushToast({ kind: t.kind, title: t.title, detail: t.detail })}
                data-testid={`debug-btn-toast-${t.kind}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-soft px-2 py-1.5 text-[11px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
              >
                {t.label}
              </button>
            ))}
          </div>
        </Row>

        {/* spec note for current selection */}
        <div className="rounded-[var(--radius)] border border-soft bg-inset px-2.5 py-2">
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-tfaint">
            <ChevronDown size={10} /> Spec position
          </div>
          <p className="text-[11px] leading-snug text-tmuted">
            {presetMatch ? presetMatch.specNote : activePreset?.specNote}
            {!presetMatch && ' Current selection deviates from every preset — treat as a custom direction.'}
          </p>
        </div>

        {/* actions */}
        <div className="flex gap-1.5">
          <button
            onClick={share}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-soft px-2 py-1.5 text-[11px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
          >
            {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
            {copied ? 'Link copied' : 'Copy share link'}
          </button>
          <button
            onClick={() => setVariant(DEFAULT_VARIANT)}
            data-tip="Restore spec-canonical defaults"
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-soft px-2.5 py-1.5 text-[11px] text-tmuted hover:bg-[var(--hover-overlay)] hover:text-tprimary"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-t border-hairline pt-2 text-[11px] text-tfaint">
          <Keyboard size={11} />
          <span>Ctrl + ` toggles this panel · Esc closes · choice persists + syncs to the URL</span>
        </div>
      </div>
    </div>
  );
}

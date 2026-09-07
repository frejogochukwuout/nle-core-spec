/* editModeIcons — R20-W2 (user directive: "visual styles you can adopt into
   both timeline and tool icons"): the 7 media-insert mode icons from the
   timeline_edit_modes (2).html reference, extracted VERBATIM (path data and
   geometry untouched, viewBox 0 0 44 44 — extracted from the header-icon
   blocks at lines 417/467/512/567/615/668) plus the speed-badge gauge
   (13×11, viewBox 0 0 14 12, lines 701-704/711-714).

   Recolor law (contract §1.4 — the ONLY adaptation, no stroke munging):
     #ffffff  → var(--text-primary)   (the incoming SOURCE — white = what the op adds)
     #8c8c8c  → var(--text-muted)     (the timeline CONTEXT — gray = what it acts on)
     #111111  → var(--bg-panel)       (Replace's knockout shafts where they cross clip edges)
   Two-tone semantics survive at any size; at 16px the 2.5-unit strokes are
   ≈0.9px visual — exactly the lucide 13px/@1.6 family look (contract §1.4
   math), so these sit in-family with the timeline/tool icons without
   touching either family's own glyphs.

   The 7th mode (placeOnTop) is NOT in this reference — it comes from
   nle_edit_workflow.html §3.4 (a lucide-style two-rect stack); per contract
   §1.2 we keep the existing lucide Layers icon for it. */

import type { ReactElement } from 'react';
import { Layers } from 'lucide-react';

export interface EditModeIconProps {
  /** rendered square size in px (transport buttons use 16). */
  size?: number;
  /** override the "source" tone (reference #ffffff) — defaults to the
   *  var(--text-primary) token. */
  sourceColor?: string;
  /** override the "context" tone (reference #8c8c8c) — defaults to
   *  var(--text-muted). */
  contextColor?: string;
  /** override the knockout tone (reference #111111) — defaults to
   *  var(--bg-panel). */
  knockoutColor?: string;
}

type ToneProps = Required<Pick<EditModeIconProps, 'size' | 'sourceColor' | 'contextColor' | 'knockoutColor'>>;

const DEFAULTS = { size: 16, sourceColor: 'var(--text-primary)', contextColor: 'var(--text-muted)', knockoutColor: 'var(--bg-panel)' };

const resolve = (p: EditModeIconProps): ToneProps => ({
  size: p.size ?? DEFAULTS.size,
  sourceColor: p.sourceColor ?? DEFAULTS.sourceColor,
  contextColor: p.contextColor ?? DEFAULTS.contextColor,
  knockoutColor: p.knockoutColor ?? DEFAULTS.knockoutColor,
});

/* the shared 44-box wrapper — every icon keeps the reference viewBox so the
   verbatim path data stays untouchable. */
const box = (t: ToneProps, children: ReactElement | ReactElement[]): ReactElement => (
  <svg width={t.size} height={t.size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

/** Insert — reference lines 417-422: flanking gray clips + raised white
 *  source + the small "everything else pushes down" chevron. */
export function InsertModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return box(t, <>
    <rect x="2" y="14" width="10" height="18" fill="none" stroke={t.contextColor} strokeWidth="2.5" rx="1" />
    <rect x="32" y="14" width="10" height="18" fill="none" stroke={t.contextColor} strokeWidth="2.5" rx="1" />
    <rect x="14" y="4" width="16" height="18" fill="none" stroke={t.sourceColor} strokeWidth="2.5" rx="1" />
    <path d="M 18 26 L 22 30 L 26 26" fill="none" stroke={t.contextColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}

/** Overwrite — reference lines 467-471: gray back-clip partially covered by
 *  the white-filled front clip + the down-trickle arrow on the right. */
export function OverwriteModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return box(t, <>
    <path d="M 6 12 h 18 v 14 h -18 z" fill="none" stroke={t.contextColor} strokeWidth="2.5" rx="1" />
    <path d="M 14 20 h 18 v 14 h -18 z" fill={t.knockoutColor} stroke={t.sourceColor} strokeWidth="2.5" rx="1" />
    <path d="M 36 6 v 8 m -3 -3 l 3 3 l 3 -3" fill="none" stroke={t.contextColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}

/** Replace — reference lines 512-526: gray outgoing + white incoming clips,
 *  two curling swap arrows, #111111 knockout lines where the shafts cross
 *  the clip edges. */
export function ReplaceModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return box(t, <>
    <rect x="2.5" y="13.5" width="18" height="15" rx="2.5" fill="none" stroke={t.contextColor} strokeWidth="2" />
    <rect x="23.5" y="13.5" width="18" height="15" rx="2.5" fill="none" stroke={t.sourceColor} strokeWidth="2" />
    <line x1="11.5" y1="27" x2="11.5" y2="33.25" stroke={t.knockoutColor} strokeWidth="6.5" />
    <line x1="32.5" y1="10.75" x2="32.5" y2="17" stroke={t.knockoutColor} strokeWidth="6.5" />
    <path d="M 11.5 19.5 L 11.5 31 Q 11.5 33.75 14.25 33.75 L 17.25 33.75 Q 20 33.75 20 31" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" />
    <path d="M 7.25 22 L 11.5 17 L 15.75 22" fill="none" stroke={t.contextColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 32.5 22.5 L 32.5 11 Q 32.5 8.25 29.75 8.25 L 26.75 8.25 Q 24 8.25 24 11" fill="none" stroke={t.sourceColor} strokeWidth="2" strokeLinecap="round" />
    <path d="M 28.25 20 L 32.5 25 L 36.75 20" fill="none" stroke={t.sourceColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}

/** Append at End — reference lines 567-574: gray back-clip (the timeline
 *  tail) + white open-corner front clip sliding in at the end + chevron. */
export function AppendModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return box(t, <>
    <rect x="18.6" y="7.9" width="20.2" height="16.7" rx="2.5" fill="none" stroke={t.contextColor} strokeWidth="2" />
    <path d="M 16.5 19.7 L 11.3 19.7 Q 8.3 19.7 8.3 22.7 L 8.3 32.7 Q 8.3 35.7 11.3 35.7 L 26.2 35.7 Q 29.2 35.7 29.2 32.7 L 29.2 27.1" fill="none" stroke={t.sourceColor} strokeWidth="2" strokeLinecap="round" />
    <path d="M 31.3 29.5 L 33.7 33.9 L 36.1 29.5" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </>);
}

/** Ripple Overwrite — reference lines 615-623: white incoming clip + the
 *  gray open-top ripple tray beneath + two outward push chevrons. */
export function RippleOverwriteModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return box(t, <>
    <path d="M 10.2 19.05 L 5.3 22.6 L 10.2 26.1" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 34.4 19.05 L 38.7 22.6 L 34.4 26.1" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="12.6" y="12.75" width="19.1" height="12.45" rx="2.2" fill="none" stroke={t.sourceColor} strokeWidth="2" />
    <path d="M 13.1 27.3 L 13.1 30.65 Q 13.1 32.25 14.7 32.25 L 30.35 32.25 Q 31.95 32.25 31.95 30.65 L 31.95 27.3" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" />
  </>);
}

/** Fit to Fill — reference lines 668-677: side brackets + outward speed
 *  chevrons ("stretch/squeeze the range") + the white source clip inside. */
export function FitToFillModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return box(t, <>
    <path d="M 17.75 12.75 L 12.4 12.75 Q 9.4 12.75 9.4 15.75 L 9.4 30.1 Q 9.4 33.1 12.4 33.1 L 17.75 33.1" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" />
    <path d="M 26.25 12.75 L 31.6 12.75 Q 34.6 12.75 34.6 15.75 L 34.6 30.1 Q 34.6 33.1 31.6 33.1 L 26.25 33.1" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" />
    <path d="M 16.9 18.75 L 11.9 22.9 L 16.9 27.1" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 27.1 18.75 L 32.1 22.9 L 27.1 27.1" fill="none" stroke={t.contextColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="20" y="13.1" width="17" height="19.4" rx="2.5" fill="none" stroke={t.sourceColor} strokeWidth="2" />
  </>);
}

/** Place on Top — NOT in this reference (nle_edit_workflow.html §3.4's
 *  lucide-style two-rect stack); the contract §1.2 ruling keeps lucide
 *  Layers. Rendered at the same square size so the family stays uniform. */
export function PlaceOnTopModeIcon(p: EditModeIconProps) {
  const t = resolve(p);
  return <Layers size={t.size} strokeWidth={1.7} aria-hidden="true" />;
}

/** The speed-badge gauge (reference lines 701-704, 13×11 viewBox 0 0 14 12)
 *  — rendered verbatim in white: it only ever lives inside the dark badge
 *  chip, so the reference's #ffffff is kept as-is (theme-invariant chip). */
export function SpeedGaugeIcon({ size = 13, height = 11 }: { size?: number; height?: number }) {
  return (
    <svg width={size} height={height} viewBox="0 0 14 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M 2 10.5 A 5.5 5.5 0 1 1 12 10.5" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="7" y1="10" x2="9.9" y2="5.9" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---- registry consumed by the SourceEditBar (order + tone in one place) ---- */
export type EditModeIconComponent = (p: EditModeIconProps) => ReactElement;

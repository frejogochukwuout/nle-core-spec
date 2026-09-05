/* Purpose-drawn trim icons (R18g, thread #23: "these two icons are not
   correct - they look like jump to head / tail").

   The old lucide ArrowLeftToLine/ArrowRightToLine glyphs read as transport
   "jump to start / jump to end". The replacement grammar is the NLE trim
   metaphor the buttons actually implement:

   - a rounded rect  = the clip
   - a tall line     = the playhead, extending beyond the clip box
   - a dim block     = the part being discarded (head / tail)
   - a solid block   = the part being kept

   TrimStartIcon: dim block LEFT of the playhead (cut head / 裁剪开始).
   TrimEndIcon:   dim block RIGHT of the playhead (cut tail / 裁剪结束).

   Drawn on the lucide 24-grid with currentColor so they inherit the
   toolbar's sizing + color CSS exactly like the lucide glyphs they
   replace. */

export function TrimStartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* clip body */}
      <rect x="3.75" y="7.75" width="16.5" height="8.5" rx="1.25" strokeWidth="1.5" />
      {/* discarded head (dim) */}
      <rect x="5" y="9" width="3.75" height="6" fill="currentColor" stroke="none" opacity="0.25" />
      {/* kept body (solid) */}
      <rect x="10.25" y="9" width="8.75" height="6" fill="currentColor" stroke="none" opacity="0.55" />
      {/* playhead at the cut point */}
      <path d="M9 5v14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TrimEndIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* clip body */}
      <rect x="3.75" y="7.75" width="16.5" height="8.5" rx="1.25" strokeWidth="1.5" />
      {/* kept body (solid) */}
      <rect x="5" y="9" width="8.75" height="6" fill="currentColor" stroke="none" opacity="0.55" />
      {/* discarded tail (dim) */}
      <rect x="16.25" y="9" width="2.75" height="6" fill="currentColor" stroke="none" opacity="0.25" />
      {/* playhead at the cut point */}
      <path d="M15 5v14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

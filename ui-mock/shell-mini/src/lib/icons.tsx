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
   SplitIcon:     the playhead CUTS the clip in the middle — both halves
                  kept (a split discards nothing), so both blocks are solid
                  (R18h thread #9: "cut in the middle, visually closer to
                  the right two" — replaces the generic lucide Scissors,
                  which read as a completely different metaphor).

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

export function SplitIcon(props: React.SVGProps<SVGSVGElement>) {
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
      {/* left half — kept (solid) */}
      <rect x="5" y="9" width="6.25" height="6" fill="currentColor" stroke="none" opacity="0.55" />
      {/* right half — kept (solid): a split discards neither part */}
      <rect x="12.75" y="9" width="6.25" height="6" fill="currentColor" stroke="none" opacity="0.55" />
      {/* the cut: playhead through the middle, past the box like its siblings */}
      <path d="M12 5v14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* R19 (thread #53): transport seek glyphs — the same purpose-drawn
   family grammar, now for the viewer transport. The NLE transport
   metaphor (standard player grammar, kept unambiguous):
   - a tall bar    = the boundary being seeked to (timeline start / a clip head)
   - a triangle    = the direction of travel (left = backward)
   - solid fill    = an actionable jump (matches the trim family's solid
                     "kept" blocks)

   ToStartIcon:  bar + DOUBLE triangle (⏮ — back to the beginning).
   ClipHeadIcon: bar + SINGLE triangle (|◀ — back to the current clip's
                 head; repeated taps walk back edit by edit). */

export function ToStartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* the start boundary (t=0) */}
      <path d="M4.5 5v14" strokeWidth="1.75" strokeLinecap="round" />
      {/* double triangle — rewind to the start */}
      <path d="M19 6.5 10.5 12 19 17.5z" fill="currentColor" stroke="none" />
      <path d="M10.5 6.5 4.5 12l6 5.5z" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

export function ClipHeadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* the clip-head boundary */}
      <path d="M4.5 5v14" strokeWidth="1.75" strokeLinecap="round" />
      {/* single triangle — back one edit point */}
      <path d="M18.5 6.5 8.5 12l10 5.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

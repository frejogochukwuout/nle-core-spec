/* TrimAffordances.tsx — R25 W2 (DESIGN-R25 §2.1 / §3 W2): the trim-mode
   affordance grammar of the reference `ui-mock/trim_edit_modes.html`,
   painted DURING the active gesture (drag-only previews — never a store
   write; the Clip owns the gesture + the geometry, this file only paints).
   One component per mode, every box positioned in the LANE's coordinate
   space (time × pxPerSec — the same law as the drag ghost and the
   insert-preview layer) and mounted as a lane-level sibling of the clip
   box, exactly where Clip renders its alt-drag ghost.

   The reference grammar (all choices vs the reference documented inline):
   - ROLL: green-edge gradients on BOTH seam sides + a two-way horizontal
     arrow at the seam (reference `.green-edge.right`/`.green-edge.left`
     + `.arrow-svg`). The reference's asymmetric 21/18px edge widths are
     mock eyeballing — unified to TRIM_EDGE_PX 18 on both sides.
   - RIPPLE: green-edge on the ACTIVE edge + dim displaced ghosts at their
     preview positions + ONE push arrow at the last-moved boundary
     (direction = the sign of the shift; the reference shows push-right).
   - SLIP: the WHITE dashed OUTLINE = the FULL SOURCE extent (the honest
     "you have this much room" frame) + the BRIGHT in-point preview block
     at the CURRENT window head, same width as the clip + in/out direction
     arrows inside the outline. The clip itself carries the red border +
     the two edge glows (those live in Clip.tsx — they are clip-children,
     not lane overlays).
   - SLIDE: the mover's red border (Clip.tsx) + the neighbors' POST-slide
     SHRINK BOXES + the direction arrows inside them.

   Color law (the house mapping of the reference's literals — the brief's
   "pick the closest house var and document the choice"):
   - red border #e2403c → var(--danger) #e5484d (the edit-state red
     family: pool-lane-bad rings, error toasts; --meter-red #ef4444 is
     meter-stop semantics and stays out of the trim grammar).
   - green edges/glows #8ce22e family → var(--mk-green) #46a758 (the
     marker green — the only non-meter green in tokens.css).
   - white boxes: the reference paints SOLID 4px #fbfdff; the house law is
     the insert-preview displaced-ghost grammar — 2px DASHED white at 85%
     alpha (the DESIGN-R25 §2.1 letter says "white dashed" for both the
     slip outline and the slide shrink boxes).

   z-law: every element z-index 10 — the drag-ghost layer (above clip
   content 1/5, below the snap indicator 40 and the playhead 100,
   canonical §17); pointer-events: none (the gesture owns the pointer). */

import type { CSSProperties } from 'react';

/** green-edge width (reference: 21 right / 18 left — unified). */
export const TRIM_EDGE_PX = 18;
/** the roll two-way arrow (seam-centered). */
export const TRIM_ROLL_ARROW_W = 44;
export const TRIM_ROLL_ARROW_H = 14;
/** the one-way arrow glyph — the insert-preview arrow twin (28×16). */
export const TRIM_ARROW_W = 28;
export const TRIM_ARROW_H = 16;

/* insert-preview-arrow-right path VERBATIM (Timeline.tsx) + its mirror +
   the double-headed roll arrow composed on the same 7px-center spine. */
const ARROW_RIGHT_PATH = 'M 0 5 L 16 5 L 16 0 L 28 8 L 16 16 L 16 11 L 0 11 Z';
const ARROW_LEFT_PATH = 'M 28 5 L 12 5 L 12 0 L 0 8 L 12 16 L 12 11 L 28 11 Z';
const ARROW_BOTH_PATH = 'M 6 4 L 38 4 L 38 0 L 44 7 L 38 14 L 38 10 L 6 10 L 6 14 L 0 7 L 6 0 Z';

const ARROW_SHADOW = 'drop-shadow(0 2px 3px rgba(0,0,0,.6))';

/* the reference's green-edge ramp: transparent → green toward the seam
   (bright AT the moving edge, fading inward), + the 9px seam glow. */
const edgeGradient = (brightAt: 'left' | 'right'): string =>
  brightAt === 'left'
    ? 'linear-gradient(to left, transparent, color-mix(in srgb, var(--mk-green) 88%, transparent))'
    : 'linear-gradient(to right, transparent, color-mix(in srgb, var(--mk-green) 88%, transparent))';
const EDGE_GLOW = '0 0 9px color-mix(in srgb, var(--mk-green) 45%, transparent)';

/** the lane's clip-body band (top 2 / height − 4 — the clip box's own law). */
const laneBody = (laneHeight: number): CSSProperties => ({ top: 2, height: Math.max(4, laneHeight - 4) });
/** vertical center for an arrow glyph inside the lane. */
const arrowTop = (laneHeight: number, h: number): number => Math.max(0, (laneHeight - h) / 2);

const WHITE_BOX_BORDER = '2px dashed rgba(251, 253, 255, 0.85)';

/* ---------- ROLL: both seam sides green + the two-way seam arrow ---------- */

/** `seamPx` = the junction's CURRENT preview position in lane px (the
 *  dragged edge time × pxPerSec). The left-of-seam box is the LEFT clip's
 *  right-edge highlight (bright at its right end = the seam); the
 *  right-of-seam box is the RIGHT clip's left-edge highlight. */
export function RollTrimAffordance({ seamPx, laneHeight }: { seamPx: number; laneHeight: number }) {
  return (
    <>
      <div
        data-testid="trim-roll-edge-l"
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ left: seamPx - TRIM_EDGE_PX, ...laneBody(laneHeight), width: TRIM_EDGE_PX, zIndex: 10, background: edgeGradient('right'), boxShadow: EDGE_GLOW }}
      />
      <div
        data-testid="trim-roll-edge-r"
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ left: seamPx, ...laneBody(laneHeight), width: TRIM_EDGE_PX, zIndex: 10, background: edgeGradient('left'), boxShadow: EDGE_GLOW }}
      />
      <svg
        data-testid="trim-roll-arrow"
        aria-hidden="true"
        width={TRIM_ROLL_ARROW_W}
        height={TRIM_ROLL_ARROW_H}
        viewBox={`0 0 ${TRIM_ROLL_ARROW_W} ${TRIM_ROLL_ARROW_H}`}
        className="absolute pointer-events-none"
        style={{ left: seamPx - TRIM_ROLL_ARROW_W / 2, top: arrowTop(laneHeight, TRIM_ROLL_ARROW_H), zIndex: 10, filter: ARROW_SHADOW }}
      >
        <path d={ARROW_BOTH_PATH} fill="#ffffff" />
      </svg>
    </>
  );
}

/* ---------- RIPPLE: active green edge + dim displaced ghosts + push arrow ---------- */

export interface RippleDisplacedBox {
  id: string;
  /** preview left in lane px (original start + the ripple shift). */
  left: number;
  width: number;
}

export interface RippleTrimGeometry {
  /** the ACTIVE edge's green box (left in lane px; side picks the ramp). */
  edgeLeft: number;
  edgeSide: 'l' | 'r';
  /** later same-track clips at their PREVIEW positions (empty when the
   *  ripple's shift is 0 — nothing moves). */
  displaced: RippleDisplacedBox[];
  /** the single push/pull arrow at the LAST-moved boundary; null when
   *  nothing is displaced. `dir` follows the shift's sign. */
  arrow: { left: number; dir: 'l' | 'r' } | null;
}

export function RippleTrimAffordance({ geo, laneHeight }: { geo: RippleTrimGeometry; laneHeight: number }) {
  return (
    <>
      <div
        data-testid="trim-ripple-edge"
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ left: geo.edgeLeft, ...laneBody(laneHeight), width: TRIM_EDGE_PX, zIndex: 10, background: edgeGradient(geo.edgeSide === 'l' ? 'left' : 'right'), boxShadow: EDGE_GLOW }}
      />
      {geo.displaced.map((d) => (
        <div
          key={`ripple-d-${d.id}`}
          data-testid={`trim-ripple-displaced-${d.id}`}
          aria-hidden="true"
          className="absolute pointer-events-none rounded-[2px]"
          style={{
            left: d.left,
            ...laneBody(laneHeight),
            width: Math.max(6, d.width),
            zIndex: 10,
            /* the reference's `.dim` treatment: the clip reads displaced at
               its shifted position, reduced to a translucent outline */
            border: '1px dashed var(--border-strong)',
            background: 'rgba(0, 0, 0, 0.35)',
            opacity: 0.55,
          }}
        />
      ))}
      {geo.arrow && (
        <svg
          data-testid="trim-ripple-arrow"
          aria-hidden="true"
          width={TRIM_ARROW_W}
          height={TRIM_ARROW_H}
          viewBox={`0 0 ${TRIM_ARROW_W} ${TRIM_ARROW_H}`}
          className="absolute pointer-events-none"
          style={{ left: geo.arrow.left, top: arrowTop(laneHeight, TRIM_ARROW_H), zIndex: 10, filter: ARROW_SHADOW }}
        >
          <path d={geo.arrow.dir === 'r' ? ARROW_RIGHT_PATH : ARROW_LEFT_PATH} fill="#ffffff" />
        </svg>
      )}
    </>
  );
}

/* ---------- SLIP: full-source outline + bright in-preview + direction arrows ---------- */

export interface SlipTrimGeometry {
  /** the source-extent frame: [left, left+width] in lane px, PINNED to the
   *  committed sourceStart (the source never moves — the window slides
   *  inside it). Width = sourceExtentOf(el) × pxPerSec (rate-1 mapping;
   *  every fixture carrier is speed 1 — see the Clip.tsx comment). */
  outline: { left: number; width: number };
  /** the bright in-point block: the CURRENT window head's position inside
   *  the outline (moves OPPOSITE the content drag), clip-width wide. */
  inPreview: { left: number; width: number };
  /** the media thumbnail when the source has one (the block reads as a lit
   *  frame of the source; audio/text fall back to a lit translucent fill). */
  thumbnail?: string;
}

export function SlipTrimAffordance({ geo, laneHeight }: { geo: SlipTrimGeometry; laneHeight: number }) {
  return (
    <>
      <div
        data-testid="trim-slip-outline"
        aria-hidden="true"
        className="absolute pointer-events-none rounded-[var(--radius)]"
        style={{ left: geo.outline.left, ...laneBody(laneHeight), width: geo.outline.width, zIndex: 10, border: WHITE_BOX_BORDER, boxSizing: 'border-box' }}
      />
      <div
        data-testid="trim-slip-in-preview"
        aria-hidden="true"
        className="absolute pointer-events-none rounded-[2px]"
        style={{
          left: geo.inPreview.left,
          ...laneBody(laneHeight),
          width: Math.max(6, geo.inPreview.width),
          zIndex: 10,
          /* the reference's `.preview-frame`: a BRIGHTER frame of the source
             at the in position — the thumbnail lit past 1 (no thumbnail →
             the lit translucent fill), edged white so it reads inside the
             dashed outline */
          ...(geo.thumbnail
            ? { backgroundImage: `url(${geo.thumbnail})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }
            : { background: 'rgba(255, 255, 255, 0.22)' }),
          filter: 'brightness(1.45)',
          border: '1px solid rgba(251, 253, 255, 0.9)',
        }}
      />
      {/* in/out direction arrows INSIDE the outline (reference: left-pointing
          in the outline's left region, right-pointing in its right region —
          the window can travel both ways inside the source) */}
      <svg
        data-testid="trim-slip-arrow-l"
        aria-hidden="true"
        width={TRIM_ARROW_W}
        height={TRIM_ARROW_H}
        viewBox={`0 0 ${TRIM_ARROW_W} ${TRIM_ARROW_H}`}
        className="absolute pointer-events-none"
        style={{ left: geo.outline.left + 8, top: arrowTop(laneHeight, TRIM_ARROW_H), zIndex: 10, filter: ARROW_SHADOW }}
      >
        <path d={ARROW_LEFT_PATH} fill="#ffffff" />
      </svg>
      <svg
        data-testid="trim-slip-arrow-r"
        aria-hidden="true"
        width={TRIM_ARROW_W}
        height={TRIM_ARROW_H}
        viewBox={`0 0 ${TRIM_ARROW_W} ${TRIM_ARROW_H}`}
        className="absolute pointer-events-none"
        style={{ left: geo.outline.left + geo.outline.width - TRIM_ARROW_W - 8, top: arrowTop(laneHeight, TRIM_ARROW_H), zIndex: 10, filter: ARROW_SHADOW }}
      >
        <path d={ARROW_RIGHT_PATH} fill="#ffffff" />
      </svg>
    </>
  );
}

/* ---------- SLIDE: neighbor shrink boxes + direction arrows ---------- */

export interface SlideTrimGeometry {
  /** the LEFT neighbor's post-slide span (its right edge = the mover's new
   *  left); null when the mover has no left neighbor. */
  shrinkL: { left: number; width: number } | null;
  /** the RIGHT neighbor's post-slide span (its left edge = the mover's new
   *  end); null when the mover has no right neighbor. */
  shrinkR: { left: number; width: number } | null;
}

export function SlideTrimAffordance({ geo, laneHeight }: { geo: SlideTrimGeometry; laneHeight: number }) {
  return (
    <>
      {geo.shrinkL && (
        <div
          data-testid="trim-slide-shrinkbox-l"
          aria-hidden="true"
          className="absolute pointer-events-none rounded-[var(--radius)]"
          style={{ left: geo.shrinkL.left, ...laneBody(laneHeight), width: geo.shrinkL.width, zIndex: 10, border: WHITE_BOX_BORDER, boxSizing: 'border-box' }}
        />
      )}
      {geo.shrinkR && (
        <div
          data-testid="trim-slide-shrinkbox-r"
          aria-hidden="true"
          className="absolute pointer-events-none rounded-[var(--radius)]"
          style={{ left: geo.shrinkR.left, ...laneBody(laneHeight), width: geo.shrinkR.width, zIndex: 10, border: WHITE_BOX_BORDER, boxSizing: 'border-box' }}
        />
      )}
      {/* direction arrows inside the boxes (reference: outward — left box
          points left, right box points right) */}
      {geo.shrinkL && (
        <svg
          data-testid="trim-slide-arrow-l"
          aria-hidden="true"
          width={TRIM_ARROW_W}
          height={TRIM_ARROW_H}
          viewBox={`0 0 ${TRIM_ARROW_W} ${TRIM_ARROW_H}`}
          className="absolute pointer-events-none"
          style={{ left: geo.shrinkL.left + 8, top: arrowTop(laneHeight, TRIM_ARROW_H), zIndex: 10, filter: ARROW_SHADOW }}
        >
          <path d={ARROW_LEFT_PATH} fill="#ffffff" />
        </svg>
      )}
      {geo.shrinkR && (
        <svg
          data-testid="trim-slide-arrow-r"
          aria-hidden="true"
          width={TRIM_ARROW_W}
          height={TRIM_ARROW_H}
          viewBox={`0 0 ${TRIM_ARROW_W} ${TRIM_ARROW_H}`}
          className="absolute pointer-events-none"
          style={{ left: geo.shrinkR.left + geo.shrinkR.width - TRIM_ARROW_W - 8, top: arrowTop(laneHeight, TRIM_ARROW_H), zIndex: 10, filter: ARROW_SHADOW }}
        >
          <path d={ARROW_RIGHT_PATH} fill="#ffffff" />
        </svg>
      )}
    </>
  );
}

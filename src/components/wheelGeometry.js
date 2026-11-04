// Wheel geometry shared by the indicator wheel and the Themes page's factor wheel
// (0° = top, clockwise; distances in px from the wheel's centre).

// Every segment owns a 60° slice. Neighbouring segments are separated by a gap
// of constant width (parallel edges, not a wedge). Factor bands use the same
// edges, so they line up with their theme's segment.
export const SLICE = 60;
export const GAP = 8; // px between neighbouring segments

export const rad = (deg) => (deg * Math.PI) / 180;
export const polar = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
export const pt = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
export const norm = (deg) => ((deg % 360) + 360) % 360;

// Angle (deg) by which a slice edge sits inside its boundary ray at radius r,
// when the edge is a straight line `offset` px from that ray.
export const edgeAngle = (offset, r) => (Math.asin(Math.min(1, offset / r)) * 180) / Math.PI;

// Annular sector filling one slice, with straight edges parallel to the slice
// boundaries (GAP/2 inside them). Inset by `corner` so a round-joined stroke of
// 2×corner restores the full size with rounded corners.
export function sectorPath(inner, outer, centre, corner) {
  const r1 = inner + corner;
  const r2 = outer - corner;
  const offset = GAP / 2 + corner;
  const start = centre - SLICE / 2;
  const end = centre + SLICE / 2;
  return [
    `M ${pt(polar(r2, start + edgeAngle(offset, r2)))}`,
    `A ${r2} ${r2} 0 0 1 ${pt(polar(r2, end - edgeAngle(offset, r2)))}`,
    `L ${pt(polar(r1, end - edgeAngle(offset, r1)))}`,
    `A ${r1} ${r1} 0 0 0 ${pt(polar(r1, start + edgeAngle(offset, r1)))}`,
    'Z',
  ].join(' ');
}

// Usable angle of a slice at radius r, between its two edges.
export const sliceSpan = (r, inset = 0) => SLICE - 2 * edgeAngle(GAP / 2 + inset, r);

// Arc for text. Segments in the lower half run anticlockwise so text stays upright.
export function textArc(r, centre, span, upright) {
  const a0 = centre - span / 2;
  const a1 = centre + span / 2;
  return upright
    ? `M ${pt(polar(r, a0))} A ${r} ${r} 0 0 1 ${pt(polar(r, a1))}`
    : `M ${pt(polar(r, a1))} A ${r} ${r} 0 0 0 ${pt(polar(r, a0))}`;
}

export const isLowerHalf = (deg) => norm(deg) > 90 && norm(deg) < 270;

// Shrink long factor labels so they fit their band (returned in rem).
export function factorFontSize(text, radius, span) {
  const available = rad(span) * radius - 28;
  const estimated = text.length * 7.4; // Manrope 500 at 14px ≈ 7.4px per character
  const px = Math.max(10.5, Math.min(14, (14 * available) / estimated));
  return `${px / 16}rem`;
}

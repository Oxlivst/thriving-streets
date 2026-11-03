// IndicatorWheel (spec §7.1, INT-05/06)
//
// Draws one indicator's wheel from indicators.json: 6 theme segments around
// the ring, mapped themes in solid colour, and the active theme's strong
// factors fanned out below it. Arrows rotate to the previous/next mapped theme;
// past the ends they call onPrev / onNext to change indicator.
//
// Geometry is measured from the Figma wheel (node 1541:65698), where the ring's
// outer radius is 252.4px. RING_RADIUS sets the size: everything placed around
// the ring follows it, while ring thickness, band thickness, text and arrows
// keep their Figma sizes. Centre = (0, 0).

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FACTOR_LABELS, WHEEL_EXPAND_ALL, WHEEL_THEMES, themeBg, themeText } from '../config/themes.js';

export const RING_RADIUS = 248; // outer radius of the theme ring (Figma: 252.4)
const RING = { outer: RING_RADIUS, inner: RING_RADIUS - 54.4, corner: 6 };
const BAND = {
  firstInner: RING_RADIUS + 4.1,
  step: 46.5,
  thickness: 41.5,
  corner: 6,
  opacities: [0.2, 0.15, 0.1, 0.08],
};
// Every segment owns a 60° slice. Neighbouring segments are separated by a gap
// of constant width (parallel edges, not a wedge). Factor bands use the same
// edges, so they line up with the active theme's segment.
const SLICE = 60;
const GAP = 8; // px between neighbouring segments
const OUTER_ARC = { firstRadius: RING_RADIUS + 9.4, step: 12.5, width: 6.6, max: 3 };
// Arrows sit just outside the lower ring, clear of the factor bands.
const ARROW = { dx: RING_RADIUS * 0.864 + 25, dy: RING_RADIUS * 0.965, size: 48 };
// Indicator text fits inside the ring's hole.
const CENTRE_TEXT_WIDTH = Math.round((RING.inner - 22) * 2 * 0.72); // narrow enough that the column corners clear the ring
// The illustration and text share a column that stays inside the ring's hole.
// The illustration takes whatever height the text leaves, up to a maximum, and
// shrinks for longer indicators.
const CENTRE_HEIGHT = Math.round(RING.inner * 1.34); // kept short so its corners stay well inside the hole
const CENTRE_ILLUSTRATION_MAX_HEIGHT = 150;
const CENTRE_ILLUSTRATION_MAX_WIDTH = 210;
const ROTATE_MS = 1100;
const easeOutQuart = (t) => 1 - (1 - t) ** 4;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ----- Geometry helpers (0° = top, clockwise) ------------------------------
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
const pt = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
const norm = (deg) => ((deg % 360) + 360) % 360;

// Angle (deg) by which a slice edge sits inside its boundary ray at radius r,
// when the edge is a straight line `offset` px from that ray.
const edgeAngle = (offset, r) => (Math.asin(Math.min(1, offset / r)) * 180) / Math.PI;

// Annular sector filling one slice, with straight edges parallel to the slice
// boundaries (GAP/2 inside them). Inset by `corner` so a round-joined stroke of
// 2×corner restores the full size with rounded corners.
function sectorPath(inner, outer, centre, corner) {
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
const sliceSpan = (r, inset = 0) => SLICE - 2 * edgeAngle(GAP / 2 + inset, r);

// Arc for text. Segments in the lower half run anticlockwise so text stays upright.
function textArc(r, centre, span, upright) {
  const a0 = centre - span / 2;
  const a1 = centre + span / 2;
  return upright
    ? `M ${pt(polar(r, a0))} A ${r} ${r} 0 0 1 ${pt(polar(r, a1))}`
    : `M ${pt(polar(r, a1))} A ${r} ${r} 0 0 0 ${pt(polar(r, a0))}`;
}

const isLowerHalf = (deg) => norm(deg) > 90 && norm(deg) < 270;

// Shrink long factor labels so they fit their band.
function factorFontSize(text, radius, span) {
  const available = rad(span) * radius - 28;
  const estimated = text.length * 7.4; // Manrope 500 at 14px ≈ 7.4px per character
  return Math.max(10.5, Math.min(14, (14 * available) / estimated));
}

// ----- Component -------------------------------------------------------------
export default function IndicatorWheel({ indicator, startAt = 'first', onPrev, onNext, hasPrev, hasNext }) {
  const uid = useId().replace(/:/g, '');

  // Strong factors grouped by theme, in ring order starting from the bottom.
  const mapped = useMemo(() => {
    const byTheme = new Map();
    for (const m of indicator.mappings) {
      if (m.strength !== 'strong') continue;
      if (!byTheme.has(m.theme)) byTheme.set(m.theme, []);
      byTheme.get(m.theme).push(m);
    }
    return WHEEL_THEMES.filter((t) => byTheme.has(t.key))
      .sort((a, b) => norm(a.angle - 180) - norm(b.angle - 180))
      .map((t) => ({ ...t, factors: byTheme.get(t.key) }));
  }, [indicator]);

  const [activeIndex, setActiveIndex] = useState(startAt === 'last' ? mapped.length - 1 : 0);
  const active = mapped[activeIndex];

  // Ring rotation: the active theme sits at the bottom (180°).
  const [rotation, setRotation] = useState(180 - active.angle);
  const rotationRef = useRef(rotation);
  useEffect(() => {
    const from = rotationRef.current;
    const delta = norm(180 - active.angle - from + 180) - 180; // shortest way round
    const to = from + delta;
    if (reduceMotion() || delta === 0) {
      rotationRef.current = to;
      setRotation(to);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ROTATE_MS);
      rotationRef.current = from + delta * easeOutQuart(t);
      setRotation(rotationRef.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active.angle]);

  // Expand-all mode: the ring stays still, every mapped theme shows its bands,
  // and the arrows move between indicators.
  const expandAll = WHEEL_EXPAND_ALL;
  const ringRotation = expandAll ? 0 : rotation;
  const expanded = expandAll ? mapped : [active];
  const isExpanded = (key) => expanded.some((t) => t.key === key);

  // Rotating mode: the arrows only turn the wheel, looping round the mapped themes.
  // Changing indicator is done by scrolling over the wheel's pane (FocusView) or ↑/↓.
  // Expanded mode has nothing to rotate, so there the arrows change indicator.
  const count = mapped.length;
  const prevIndex = (activeIndex - 1 + count) % count;
  const nextIndex = (activeIndex + 1) % count;
  const goPrev = () => (expandAll ? onPrev?.() : setActiveIndex(prevIndex));
  const goNext = () => (expandAll ? onNext?.() : setActiveIndex(nextIndex));
  const prevLabel = expandAll ? 'Previous indicator' : `Rotate to ${mapped[prevIndex].label.join(' ')}`;
  const nextLabel = expandAll ? 'Next indicator' : `Rotate to ${mapped[nextIndex].label.join(' ')}`;
  const prevDisabled = expandAll ? !hasPrev : count < 2;
  const nextDisabled = expandAll ? !hasNext : count < 2;

  // In expand-all mode the wheel can outgrow its 600px box; scale it to fit.
  const mostFactors = Math.max(...expanded.map((t) => t.factors.length));
  const reach = BAND.firstInner + mostFactors * BAND.step + 8;
  const fit = expandAll ? Math.min(1, 300 / reach) : 1;
  const arrowPos = expandAll
    ? { prev: [300 - 64, 300 + reach + 16], next: [300 + 64 - ARROW.size, 300 + reach + 16] }
    : {
        prev: [300 - ARROW.dx - ARROW.size / 2, 300 + ARROW.dy - ARROW.size / 2],
        next: [300 + ARROW.dx - ARROW.size / 2, 300 + ARROW.dy - ARROW.size / 2],
      };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') (e.preventDefault(), goPrev());
    if (e.key === 'ArrowRight') (e.preventDefault(), goNext());
    if (e.key === 'ArrowUp' && hasPrev) (e.preventDefault(), onPrev?.());
    if (e.key === 'ArrowDown' && hasNext) (e.preventDefault(), onNext?.());
  };

  return (
    <div
      className="relative h-[700px] w-[600px]"
      role="group"
      aria-roledescription="indicator wheel"
      aria-label={indicator.text}
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0" style={{ transform: `scale(${fit})`, transformOrigin: '300px 300px' }}>
      <svg viewBox="-300 -300 600 700" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {/* ----- Ring: one segment per theme ----- */}
        {WHEEL_THEMES.map((theme) => {
          const centre = theme.angle + ringRotation;
          const themeMapping = mapped.find((m) => m.key === theme.key);
          const isMapped = Boolean(themeMapping);
          const isActive = isExpanded(theme.key);
          const upright = !isLowerHalf(centre);
          const lines = theme.label;
          const mid = (RING.inner + RING.outer) / 2;
          // Two-line labels sit either side of the middle; line 1 is always the upper line.
          const radii = lines.length === 1 ? [mid] : upright ? [mid + 9, mid - 9] : [mid - 9, mid + 9];

          // In rotating mode, clicking a mapped theme turns it to the bottom and expands its factors.
          const clickable = !expandAll && isMapped && !isActive;
          return (
            <g
              key={theme.key}
              className={clickable ? 'wheel-segment wheel-segment--clickable' : 'wheel-segment'}
              onClick={clickable ? () => setActiveIndex(mapped.findIndex((m) => m.key === theme.key)) : undefined}
            >
              <path
                d={sectorPath(RING.inner, RING.outer, centre, RING.corner)}
                fill={themeBg(theme.key)}
                stroke={themeBg(theme.key)}
                strokeWidth={RING.corner * 2}
                strokeLinejoin="round"
                opacity={isMapped ? 0.9 : 0.15}
              />

              {/* Outer arcs: one per strong factor, on mapped themes that aren't active. */}
              {isMapped &&
                !isActive &&
                themeMapping.factors.slice(0, OUTER_ARC.max).map((_, i) => {
                  const r = OUTER_ARC.firstRadius + i * OUTER_ARC.step;
                  return (
                    <path
                      key={i}
                      d={textArc(r, centre, sliceSpan(r, OUTER_ARC.width / 2), true)}
                      fill="none"
                      stroke={themeBg(theme.key)}
                      strokeWidth={OUTER_ARC.width}
                      strokeLinecap="round"
                      opacity={0.5}
                    />
                  );
                })}

              {lines.map((line, i) => {
                const id = `${uid}-${theme.key}-${i}`;
                return (
                  <g key={i}>
                    <path id={id} d={textArc(radii[i], centre, 120, upright)} fill="none" />
                    <text
                      className="font-body"
                      fontSize={isActive ? 15 : 16}
                      fontWeight={isMapped ? 600 : 700}
                      fill={isMapped ? '#fff' : 'var(--color-label-muted)'}
                      dominantBaseline="central"
                    >
                      <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                        {line}
                      </textPath>
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* ----- Factor bands: under the active theme, or under every mapped theme ----- */}
        {expanded.map((theme) => {
          const centre = theme.angle + ringRotation;
          const upright = !isLowerHalf(centre);
          return (
            <g key={expandAll ? theme.key : `active-${theme.key}`} className="wheel-bands">
              {theme.factors.map((factor, i) => {
                const inner = BAND.firstInner + i * BAND.step;
                const outer = inner + BAND.thickness + i;
                const mid = (inner + outer) / 2;
                const id = `${uid}-band-${theme.key}-${i}`;
                const name = factorName(indicator, factor);
                return (
                  <g key={factor.factor} style={{ animationDelay: `${250 + i * 140}ms` }} className="wheel-band">
                    <path
                      d={sectorPath(inner, outer, centre, BAND.corner)}
                      fill={themeBg(theme.key)}
                      stroke={themeBg(theme.key)}
                      strokeWidth={BAND.corner * 2}
                      strokeLinejoin="round"
                      opacity={BAND.opacities[i] ?? 0.08}
                    />
                    <path id={id} d={textArc(mid, centre, SLICE + 30, upright)} fill="none" />
                    <text
                      className="font-body"
                      fontSize={factorFontSize(name, mid, sliceSpan(mid))}
                      fontWeight={500}
                      fill={themeText(theme.key)}
                      dominantBaseline="central"
                    >
                      <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                        {name}
                      </textPath>
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* ----- Centre: a small copy of the illustration above the indicator text ----- */}
      <div
        className="absolute flex flex-col items-center justify-center gap-2 text-center"
        style={{ left: 300 - CENTRE_TEXT_WIDTH / 2, top: 300 - CENTRE_HEIGHT / 2, width: CENTRE_TEXT_WIDTH, height: CENTRE_HEIGHT }}
      >
        {indicator.illustration && (
          // Shrinkable wrapper: starts at the maximum height, gives way when the text needs room.
          <div className="flex min-h-0 shrink justify-center" style={{ height: CENTRE_ILLUSTRATION_MAX_HEIGHT }}>
            <img
              src={indicator.illustration}
              alt=""
              className="h-full w-auto object-contain"
              style={{ maxWidth: CENTRE_ILLUSTRATION_MAX_WIDTH }}
              onError={(e) => (e.currentTarget.parentElement.hidden = true)} // no artwork yet: text only
            />
          </div>
        )}
        <p className="shrink-0 text-[17px] leading-[1.3] font-semibold text-text">{indicator.text}</p>
      </div>

      {/* ----- Arrows ----- */}
      <button
        type="button"
        className="wheel-arrow disabled:opacity-40"
        style={{ left: arrowPos.prev[0], top: arrowPos.prev[1] }}
        onClick={goPrev}
        disabled={prevDisabled}
        aria-label={prevLabel}
      >
        <RotateIcon direction="left" />
      </button>
      <button
        type="button"
        className="wheel-arrow disabled:opacity-40"
        style={{ left: arrowPos.next[0], top: arrowPos.next[1] }}
        onClick={goNext}
        disabled={nextDisabled}
        aria-label={nextLabel}
      >
        <RotateIcon direction="right" />
      </button>
      </div>

      {/* Keyboard / screen-reader version of clicking a theme. */}
      {!expandAll && (
        <ul className="sr-only">
          {mapped.map((theme, i) => (
            <li key={theme.key}>
              <button type="button" onClick={() => setActiveIndex(i)} aria-pressed={i === activeIndex}>
                Show {theme.label.join(' ')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ----- Text version for screen readers ----- */}
      <div className="sr-only" aria-live="polite">
        {expanded.map((t) => `${t.label.join(' ')}: ${t.factors.map((f) => factorName(indicator, f)).join(', ')}`).join('. ')}
      </div>
    </div>
  );
}

const factorName = (indicator, mapping) => FACTOR_LABELS[mapping.factor] ?? mapping.factorName;

// Solid rotate arrow: a filled arrowhead on a thick curved body that tapers to a
// point. Flipped vertically and turned 60° inwards; the left button is the mirror of the right.
function RotateIcon({ direction }) {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <path
        d="M19 3.5L30 13.5L19 23.5V18C12.4 18 7.2 20.6 3 27C3.8 16.2 10.4 9 19 9Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        // Flipped vertically, then turned 60° inwards (right: anticlockwise; left: clockwise, as its mirror).
        transform={
          direction === 'left'
            ? 'rotate(60 16 16) translate(32 32) scale(-1 -1)'
            : 'rotate(-60 16 16) translate(0 32) scale(1 -1)'
        }
      />
    </svg>
  );
}

// ThemesWheel: the wheel at the top of the Themes & Factors page.
// Figma: file BWfZznPABe6QYhxxBGhOdp, node 6917:5930 (the collage version).
//
// It starts as the theme ring with a photo collage per theme. Once the wheel is fully
// in view it holds still (sticky), and the next SWAP_PX of scrolling turns it into the
// factor version: the collages drift outwards and fade, the Equity & Safety ring appears
// around the themes, and each theme's factors fan out from its segment as bands, styled
// like the indicator wheel's. Then the page scrolls on. Scrolling back reverses it.
//
// The swap is tied to the scroll position (progress p, from 0 to 1), not played as an
// animation, so it never runs on its own. Each frame, only the parts whose fade or drift
// actually changes are updated (a few bands at a time), to stay light on slow computers.

import { useEffect, useRef } from 'react';
import data from '../data/indicators.json';
import { FACTOR_LABELS, WHEEL_THEMES, themeBg, themeText } from '../config/themes.js';
import { SLICE, sectorPath, sliceSpan, textArc, isLowerHalf, factorFontSize, polar } from './wheelGeometry.js';

const BASE = `${import.meta.env.BASE_URL}illustrations/themes-wheel/`;
const BOX = { width: 942, height: 934 }; // the Figma frame; parts are placed in % of it

// The ring (an SVG drawn in Figma), and its centre and outer radius inside BOX
// (measured from the ring's own drawing: centre 245.05, 239.2; outer radius 210).
const RING = { x: 229.607, y: 204.094, width: 484, height: 484.44 };
const CENTRE = { x: RING.x + 245.05, y: RING.y + 239.2 };
const RING_OUTER = 210;

// One collage per theme, at its Figma position.
const COLLAGES = [
  { name: 'nature', x: 297.742, y: 0, width: 348.477, height: 228.772 },
  { name: 'movement', x: 666.42, y: 122.134, width: 273.956, height: 318.131 },
  { name: 'economy', x: 644.163, y: 432.874, width: 326.349, height: 350.236 },
  { name: 'community', x: 286.522, y: 626.681, width: 369.49, height: 309.576 },
  { name: 'governance', x: 1.691, y: 503.247, width: 300.674, height: 280.286 },
  { name: 'health', x: 0.292, y: 107.425, width: 310.831, height: 362.349 },
];

// Equity & Safety: a full ring just outside the themes, the cross-cutting lenses on
// every theme. Shaded from Equity (left) to Safety (right), each named along its side.
const LENS = { inner: RING_OUTER + 4, outer: RING_OUTER + 44 };
const LENS_LABELS = [
  { text: 'Equity', angle: 270, colour: themeBg('social-connection') },
  { text: 'Safety', angle: 90, colour: themeBg('community-agency') },
];

// Factor bands: outside the Equity & Safety ring, room for the largest theme's six factors.
const BAND = { firstInner: LENS.outer + 4, step: 35, thickness: 31.5, corner: 6 };
const BAND_OPACITIES = [0.22, 0.18, 0.14, 0.11, 0.09, 0.07]; // fading outwards, as on the indicator wheel

export const SWAP_PX = 640; // scroll distance over which the wheel changes
const SMOOTHING = 0.12; // share of the remaining way p moves each frame (lower = softer, more lag)

// How each part follows p. smoothstep starts and ends gently.
const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const COLLAGE_FADE = (p) => smoothstep(clamp01(p * 2.2)); // gone by p ≈ 0.45
const BAND_SHOW = (p, i) => smoothstep(clamp01((p - 0.3 - i * 0.09) / 0.26)); // ring (i = -1), then bands outwards
const COLLAGE_DRIFT_PX = 48;
const BAND_DRIFT_PX = 18;

const pct = (value, of) => `${(value / of) * 100}%`;
const themesByKey = new Map(data.themes.map((t) => [t.key, t]));

// Full ring between two radii (the hole cut out with the even-odd rule).
const annulus = (inner, outer) =>
  [outer, inner].map((r) => `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`).join(' ');

function LensRing() {
  const mid = (LENS.inner + LENS.outer) / 2;
  return (
    <g className="themes-wheel__band" data-i={-1} data-dx="0" data-dy="0">
      <defs>
        <linearGradient id="themes-lens-shade" gradientUnits="userSpaceOnUse" x1={-LENS.outer} y1="0" x2={LENS.outer} y2="0">
          <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${themeBg('social-connection')} 14%, white)` }} />
          <stop offset="1" style={{ stopColor: `color-mix(in srgb, ${themeBg('community-agency')} 16%, white)` }} />
        </linearGradient>
      </defs>
      <path d={annulus(LENS.inner, LENS.outer)} fill="url(#themes-lens-shade)" fillRule="evenodd" />
      {LENS_LABELS.map((label) => (
        <g key={label.text}>
          {/* Clockwise arcs: "Equity" reads upwards on the left, "Safety" downwards on the right. */}
          <path id={`themes-lens-${label.text}`} d={textArc(mid, label.angle, 50, true)} fill="none" />
          <text className="font-body" fontSize="1rem" fontStyle="italic" fill={label.colour} dominantBaseline="central">
            <textPath href={`#themes-lens-${label.text}`} startOffset="50%" textAnchor="middle">
              {label.text}
            </textPath>
          </text>
        </g>
      ))}
    </g>
  );
}

function FactorBands() {
  return (
    <svg className="themes-wheel__factors" viewBox={`0 0 ${BOX.width} ${BOX.height}`} aria-hidden="true">
      <g transform={`translate(${CENTRE.x} ${CENTRE.y})`}>
        <LensRing />
        {WHEEL_THEMES.map((wheelTheme) => {
          const theme = themesByKey.get(wheelTheme.key);
          if (!theme) return null;
          const centre = wheelTheme.angle;
          const upright = !isLowerHalf(centre);
          const [dx, dy] = polar(1, centre); // outward direction, for the fan-out motion
          return (
            <g key={theme.key}>
              {theme.factors.map((factor, i) => {
                const inner = BAND.firstInner + i * BAND.step;
                const outer = inner + BAND.thickness;
                const mid = (inner + outer) / 2;
                const id = `themes-band-${theme.key}-${i}`;
                const name = FACTOR_LABELS[factor.key] ?? factor.name;
                return (
                  <g key={factor.key} className="themes-wheel__band" data-i={i} data-dx={dx.toFixed(3)} data-dy={dy.toFixed(3)}>
                    <path
                      d={sectorPath(inner, outer, centre, BAND.corner)}
                      fill={themeBg(theme.key)}
                      stroke={themeBg(theme.key)}
                      strokeWidth={BAND.corner * 2}
                      strokeLinejoin="round"
                      opacity={BAND_OPACITIES[i] ?? 0.06}
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
      </g>
    </svg>
  );
}

export default function ThemesWheel() {
  const trackRef = useRef(null);
  const wheelRef = useRef(null);

  // p: 0 when the wheel first holds still, 1 once SWAP_PX more has been scrolled.
  // It eases towards the scroll position each frame (instead of jumping with each
  // scroll step), so the change glides; with reduced motion it follows exactly.
  useEffect(() => {
    const track = trackRef.current;
    const wheel = wheelRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const parts = [
      ...[...wheel.querySelectorAll('.themes-wheel__collage')].map((el) => ({ el, kind: 'collage' })),
      ...[...wheel.querySelectorAll('.themes-wheel__band')].map((el) => ({ el, kind: 'band', i: Number(el.dataset.i) })),
    ].map((part) => ({ ...part, dx: Number(part.el.dataset.dx), dy: Number(part.el.dataset.dy), last: null }));
    // Write a part's style only when its value has changed.
    const paint = (p) => {
      for (const part of parts) {
        const v = part.kind === 'collage' ? COLLAGE_FADE(p) : BAND_SHOW(p, part.i);
        const key = Math.round(v * 1000);
        if (key === part.last) continue;
        part.last = key;
        if (part.kind === 'collage') {
          part.el.style.opacity = String(1 - v);
          part.el.style.transform = `translate(${part.dx * v * COLLAGE_DRIFT_PX}px, ${part.dy * v * COLLAGE_DRIFT_PX}px) scale(${1 - v * 0.06})`;
        } else {
          part.el.style.opacity = String(v);
          part.el.style.transform = `translate(${part.dx * (v - 1) * BAND_DRIFT_PX}px, ${part.dy * (v - 1) * BAND_DRIFT_PX}px)`;
        }
      }
    };
    let frame = 0;
    let shown = null;
    const target = () => {
      const stickyTop = parseFloat(getComputedStyle(wheel).top) || 0;
      return Math.min(1, Math.max(0, (stickyTop - track.getBoundingClientRect().top) / SWAP_PX));
    };
    const update = () => {
      frame = 0;
      const goal = target();
      shown = shown === null || reduce ? goal : shown + (goal - shown) * SMOOTHING;
      if (Math.abs(goal - shown) < 0.001) shown = goal;
      wheel.dataset.progress = shown.toFixed(3);
      paint(shown);
      if (shown !== goal) frame = requestAnimationFrame(update); // keep easing until it arrives
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={trackRef} className="themes-wheel-track" style={{ '--swap': `${SWAP_PX}px` }}>
      <div
        ref={wheelRef}
        className="themes-wheel"
        role="img"
        aria-label="The six themes on a wheel, each with a collage from the workshops. Scrolling on, equity and safety appear as a ring around all six themes, and each theme's factors fan out around it: they are listed, theme by theme, further down the page."
      >
        <img
          className="themes-wheel__part"
          src={`${BASE}themes-wheel-ring.svg`}
          alt=""
          style={{ left: pct(RING.x, BOX.width), top: pct(RING.y, BOX.height), width: pct(RING.width, BOX.width) }}
        />
        <FactorBands />
        {COLLAGES.map((c) => {
          // Outward direction from the ring's centre, for the collages' drift.
          const dx = c.x + c.width / 2 - CENTRE.x;
          const dy = c.y + c.height / 2 - CENTRE.y;
          const length = Math.hypot(dx, dy);
          return (
            <img
              key={c.name}
              className="themes-wheel__part themes-wheel__collage"
              src={`${BASE}collage-${c.name}.webp`}
              srcSet={`${BASE}collage-${c.name}.webp 1x, ${BASE}collage-${c.name}@2x.webp 2x`}
              alt=""
              data-dx={(dx / length).toFixed(3)}
              data-dy={(dy / length).toFixed(3)}
              style={{ left: pct(c.x, BOX.width), top: pct(c.y, BOX.height), width: pct(c.width, BOX.width) }}
            />
          );
        })}
      </div>
    </div>
  );
}

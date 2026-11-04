// Whether scroll-driven effects (the parallax drift) should run. They are off for anyone
// who asks for reduced motion, and on touch screens and narrow windows: on phones they
// cost a style update of a whole scene on every scroll frame and make scrolling lag.
// (960px is DRAWER_BELOW in src/config/layout.js.)
const QUERY = '(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 959.98px)';

export const scrollEffectsOff = () => window.matchMedia(QUERY).matches;

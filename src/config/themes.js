// How each theme is drawn on the indicator wheel.
// Keys match src/data/indicators.json; colours come from tokens.css.
//
// `angle` is the segment's centre on the ring (0 = top, clockwise), in the
// order of the Figma wheel (Asset 11, node 1541:65698).
// `label` lines are the short names shown on the ring.

export const WHEEL_THEMES = [
  { key: 'living-with-nature', angle: 0, label: ['Living with Nature'] },
  { key: 'freedom-to-move', angle: 60, label: ['Freedom to Move'] },
  { key: 'economic-vitality', angle: 120, label: ['Economic Vitality', '& Local Character'] },
  { key: 'social-connection', angle: 180, label: ['Social Connection', '& Belonging'] },
  { key: 'community-agency', angle: 240, label: ['Community', 'Governance & Agency'] },
  { key: 'healthy-lives', angle: 300, label: ['Healthy Lives'] },
];

// Wheel mode (being compared):
//   true  — every mapped theme shows its strong factors at once; arrows change indicator
//   false — one theme at a time, rotated to the bottom; arrows step through themes
export const WHEEL_EXPAND_ALL = false;

// Shorter names for factors on the wheel, keyed by factor key (see indicators.json).
// The CSV keeps the full names; these only change what the wheel shows.
export const FACTOR_LABELS = {
  'local-empowerment-and-community-leadership': 'Community leadership',
};

export const themeBg = (key) => `var(--color-theme-${key}-bg)`;
export const themeText = (key) => `var(--color-theme-${key}-text)`;

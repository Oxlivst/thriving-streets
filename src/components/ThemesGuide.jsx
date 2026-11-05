// ThemesGuide: the Themes & Factors page's side nav and theme sections.
// Figma: "Wireframe - 51" (file BWfZznPABe6QYhxxBGhOdp, node 6917:5927).
//
// Both come from data/indicator-mapping.csv (via src/data/indicators.json): the six
// themes in sheet order, each with its factors and their summaries (the sheet's `0.` row).
// The "Overview" section above them is static copy in themes.html.
// Under each factor's summary: the drawings of the indicators that map to it; clicking
// one opens its wheel (IndicatorModal).

import { useState } from 'react';
import data from '../data/indicators.json';
import IndicatorModal from './IndicatorModal.jsx';
import { scenes } from '../config/scenes.js';
import { WHEEL_THEMES, themeBg, themeText } from '../config/themes.js';
import SectionNav from './SectionNav.jsx';

// Display names, e.g. "Social Connection & Belonging" (the sheet spells out "and").
const themeTitle = (key) =>
  WHEEL_THEMES.find((t) => t.key === key)
    ?.label.join(' ')
    .trim();
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();

// Illustration paths in the data are relative to the site root; BASE_URL makes them work
// wherever the site is hosted.
const withBase = (path) => import.meta.env.BASE_URL + path;
const indicators = data.indicators.map((i) => ({
  ...i,
  illustration: withBase(i.illustration),
  illustrationFaded: withBase(i.illustrationFaded),
  thumbnail: withBase(i.illustrationWebp),
}));
// Factor key → the indicators that map to it, in number order. Only indicators that are
// drawn yet (the ones placed in a homepage scene) are shown.
const drawn = new Set(scenes.flatMap((scene) => scene.slots.map((slot) => slot.indicator)));
const indicatorsByFactor = new Map();
for (const indicator of indicators.filter((i) => drawn.has(i.number)).sort((a, b) => a.number - b.number)) {
  for (const { factor } of indicator.mappings) {
    if (!indicatorsByFactor.has(factor)) indicatorsByFactor.set(factor, []);
    if (!indicatorsByFactor.get(factor).includes(indicator)) indicatorsByFactor.get(factor).push(indicator);
  }
}

const themes = data.themes.map((theme) => ({ ...theme, title: themeTitle(theme.key) ?? theme.name }));

// Summaries with numbered points ("1. … 2. …") become one paragraph per point.
const paragraphs = (text) => text.split(/\s+(?=\d+\.\s)/).filter(Boolean);

// Side nav: Overview, then the six themes (each highlighted in its colour).
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  ...themes.map((theme) => ({ id: theme.key, label: sentenceCase(theme.title), colour: themeText(theme.key) })),
];

export function ThemesNav() {
  return <SectionNav items={NAV_ITEMS} />;
}

export function ThemeSections() {
  const [open, setOpen] = useState(null); // { indicator, theme } whose wheel is open
  return (
    <>
      {themes.map((theme, i) => (
        <section
          key={theme.key}
          id={theme.key}
          className="theme-section"
          aria-labelledby={`${theme.key}-title`}
          style={{ '--theme-bg': themeBg(theme.key), '--theme-text': themeText(theme.key) }}
        >
          <h2 id={`${theme.key}-title`} className="theme-section__title">
            {i + 1}. {theme.title}
          </h2>
          <div className="theme-section__factors">
            {theme.factors.map((factor) => (
              <article key={factor.key} id={factor.key} className="factor">
                <h3 className="factor__name">{factor.name}</h3>
                <div className="factor__summary">
                  {paragraphs(factor.description).map((text, j) => (
                    <p key={j}>{text}</p>
                  ))}
                </div>
                {indicatorsByFactor.has(factor.key) && (
                  <ul className="factor__indicators" aria-label={`Indicators drawing on ${factor.name.toLowerCase()}`}>
                    {indicatorsByFactor.get(factor.key).map((indicator) => (
                      <li key={indicator.number} className="contents">
                        <button
                          type="button"
                          className="factor__indicator"
                          aria-label={indicator.text}
                          aria-haspopup="dialog"
                          onClick={() => setOpen({ indicator, theme: theme.key })}
                        >
                          <img src={indicator.thumbnail} alt="" loading="lazy" decoding="async" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {open && <IndicatorModal indicator={open.indicator} theme={open.theme} onClose={() => setOpen(null)} />}
    </>
  );
}

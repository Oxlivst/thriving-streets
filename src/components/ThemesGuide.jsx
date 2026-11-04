// ThemesGuide: the Themes & Factors page's side nav and theme sections.
// Figma: "Wireframe - 51" (file BWfZznPABe6QYhxxBGhOdp, node 6917:5927).
//
// Both come from data/indicator-mapping.csv (via src/data/indicators.json): the six
// themes in sheet order, each with its factors and their summaries (the sheet's `0.` row).
// The "Overview" section above them is static copy in themes.html.

import data from '../data/indicators.json';
import { WHEEL_THEMES, themeBg, themeText } from '../config/themes.js';
import SectionNav from './SectionNav.jsx';

// Display names, e.g. "Social Connection & Belonging" (the sheet spells out "and").
const themeTitle = (key) =>
  WHEEL_THEMES.find((t) => t.key === key)
    ?.label.join(' ')
    .trim();
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();

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
  return themes.map((theme, i) => (
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
          <article key={factor.key} className="factor">
            <h3 className="factor__name">{factor.name}</h3>
            <div className="factor__summary">
              {paragraphs(factor.description).map((text, j) => (
                <p key={j}>{text}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  ));
}

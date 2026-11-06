// ThemesGuide: the Themes & Factors page's side nav and theme sections.
// Figma: "Wireframe - 51" (file BWfZznPABe6QYhxxBGhOdp, node 6917:5927).
//
// Both come from data/indicator-mapping.csv (via src/data/indicators.json): the six
// themes in sheet order, each with its factors and their summaries (the sheet's `0.` row).
// The "Overview" section above them is static copy in themes.html.
// Under each factor's summary: the drawings of the indicators that map to it. Resting the
// mouse on one (or focusing it) shows its text in a label, as on the homepage; clicking one
// opens its wheel (IndicatorModal).

import { useEffect, useState } from 'react';
import data from '../data/indicators.json';
import IndicatorModal from './IndicatorModal.jsx';
import HoverLabelBody, { LABEL_DELAY_MS, LABEL_HINT } from './HoverLabelBody.jsx';
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
  thumbnail: withBase(i.illustration),
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
  ...themes.map((theme) => ({ id: theme.key, label: sentenceCase(theme.title), colour: themeBg(theme.key) })),
];

export function ThemesNav() {
  return <SectionNav items={NAV_ITEMS} />;
}

export function ThemeSections() {
  const [open, setOpen] = useState(null); // { indicator, theme } whose wheel is open

  // The drawing being hovered (mouse) or focused, as "factor:number" (an indicator can sit
  // under several factors); its label shows after LABEL_DELAY_MS, as on the homepage.
  const [hovered, setHovered] = useState(null);
  const [labelFor, setLabelFor] = useState(null);
  useEffect(() => {
    setLabelFor(null);
    if (hovered === null) return;
    const t = setTimeout(() => setLabelFor(hovered), LABEL_DELAY_MS);
    return () => clearTimeout(t);
  }, [hovered]);
  // Esc hides the label until the hover moves to another drawing.
  useEffect(() => {
    if (labelFor === null) return;
    const onKey = (e) => e.key === 'Escape' && setLabelFor(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [labelFor]);
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
                  <>
                    {/* Read out before the drawings, so screen readers know what they are. */}
                    <p id={`${factor.key}-indicators`} className="sr-only">
                      Indicators drawing on {factor.name.toLowerCase()}:
                    </p>
                    <ul className="factor__indicators" aria-labelledby={`${factor.key}-indicators`}>
                      {indicatorsByFactor.get(factor.key).map((indicator) => {
                        const id = `${factor.key}:${indicator.number}`;
                        const leave = () => setHovered((h) => (h === id ? null : h));
                        return (
                          <li
                            key={indicator.number}
                            className="factor__item"
                            // Mouse only: a tap opens the wheel straight away.
                            onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(id)}
                            onPointerLeave={leave}
                          >
                            <button
                              type="button"
                              className="factor__indicator"
                              aria-label={`${indicator.text}. Opens its themes and factors.`}
                              aria-haspopup="dialog"
                              onClick={() => {
                                setHovered(null);
                                setOpen({ indicator, theme: theme.key });
                              }}
                              onFocus={(e) => e.currentTarget.matches(':focus-visible') && setHovered(id)}
                              onBlur={leave}
                            >
                              <img src={indicator.thumbnail} alt="" loading="lazy" decoding="async" />
                            </button>
                            {/* The label repeats the button's name, so screen readers skip it. While
                                shown it catches the pointer, so the mouse can rest on it (WCAG 1.4.13). */}
                            <div
                              className="hover-label"
                              aria-hidden="true"
                              data-visible={labelFor === id}
                              onClick={() => setOpen({ indicator, theme: theme.key })}
                            >
                              <HoverLabelBody text={indicator.text} hint={LABEL_HINT} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
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

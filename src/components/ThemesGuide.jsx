// ThemesGuide: the Themes & Factors page's side nav and theme sections.
// Figma: "Wireframe - 51" (file BWfZznPABe6QYhxxBGhOdp, node 6917:5927).
//
// Both come from data/indicator-mapping.csv (via src/data/indicators.json): the six
// themes in sheet order, each with its factors and their summaries (the sheet's `0.` row).
// The "Overview" section above them is static copy in themes.html.

import { useEffect, useRef, useState } from 'react';
import data from '../data/indicators.json';
import { WHEEL_THEMES, themeBg, themeText } from '../config/themes.js';
import useNarrow from '../hooks/useNarrow.js';

// Display names, e.g. "Social Connection & Belonging" (the sheet spells out "and").
const themeTitle = (key) =>
  WHEEL_THEMES.find((t) => t.key === key)
    ?.label.join(' ')
    .trim();
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();

const themes = data.themes.map((theme) => ({ ...theme, title: themeTitle(theme.key) ?? theme.name }));
const SECTION_IDS = ['overview', ...themes.map((t) => t.key)];

// Summaries with numbered points ("1. … 2. …") become one paragraph per point.
const paragraphs = (text) => text.split(/\s+(?=\d+\.\s)/).filter(Boolean);

// The section nearest the top of the window (a little below the nav) is current.
function useCurrentSection() {
  const [current, setCurrent] = useState(SECTION_IDS[0]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let found = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) found = id;
      }
      setCurrent(found);
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
  return current;
}

// Side nav. Below the drawer breakpoint (src/config/layout.js) it collapses into a
// drawer on the left, opened from a tab on the window's edge; picking a section,
// clicking outside it or Esc closes it again.
export function ThemesNav() {
  const current = useCurrentSection();
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);
  const tabRef = useRef(null);

  useEffect(() => {
    if (!narrow) setOpen(false);
  }, [narrow]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      tabRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const list = (
    <ul className="themes-nav__list">
      <li>
        <a
          className="themes-nav__link"
          href="#overview"
          aria-current={current === 'overview' ? 'location' : undefined}
          onClick={() => setOpen(false)}
        >
          Overview
        </a>
      </li>
      {themes.map((theme) => (
        <li key={theme.key}>
          <a
            className="themes-nav__link"
            href={`#${theme.key}`}
            aria-current={current === theme.key ? 'location' : undefined}
            style={{ '--theme-colour': themeText(theme.key) }}
            onClick={() => setOpen(false)}
          >
            {sentenceCase(theme.title)}
          </a>
        </li>
      ))}
    </ul>
  );

  if (!narrow) return list;

  return (
    <>
      <div className={`themes-drawer ${open ? 'themes-drawer--open' : ''}`}>
        <div id="themes-drawer-panel" className="themes-drawer__panel" inert={!open}>
          {list}
        </div>
        <button
          ref={tabRef}
          type="button"
          className="themes-drawer__tab"
          aria-expanded={open}
          aria-controls="themes-drawer-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <span>{open ? 'Close' : 'Contents'}</span>
          <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && <div className="themes-drawer__scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
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

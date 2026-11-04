// SectionNav: a page's side nav ("on this page" links), used on the Themes & Factors
// and About pages. It highlights the section being read. Below the drawer breakpoint
// (src/config/layout.js) it collapses into a drawer on the left, opened from a tab on
// the window's edge; picking a section, clicking outside it or Esc closes it again.
//
// items: [{ id, label, colour? }] — id is the section's element id; colour (optional)
// fills the link when it is the current section (default: text-primary).

import { useEffect, useMemo, useRef, useState } from 'react';
import useNarrow from '../hooks/useNarrow.js';

// The section nearest the top of the window (a little below the nav) is current.
function useCurrentSection(ids) {
  const [current, setCurrent] = useState(ids[0]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let found = ids[0];
      for (const id of ids) {
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
  }, [ids]);
  return current;
}

export default function SectionNav({ items }) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const current = useCurrentSection(ids);
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
    <ul className="side-nav__list">
      {items.map((item) => (
        <li key={item.id}>
          <a
            className="side-nav__link"
            href={`#${item.id}`}
            title={item.label}
            aria-current={current === item.id ? 'location' : undefined}
            style={item.colour ? { '--theme-colour': item.colour } : undefined}
            onClick={() => setOpen(false)}
          >
            <span className="side-nav__label">{item.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );

  if (!narrow) return list;

  return (
    <>
      <div className={`side-drawer ${open ? 'side-drawer--open' : ''}`}>
        <div id="side-drawer-panel" className="side-drawer__panel" inert={!open}>
          {list}
        </div>
        {/* Hamburger while closed (on the window's edge); × while open (inside the drawer's corner). */}
        <button
          ref={tabRef}
          type="button"
          className="side-drawer__tab"
          aria-expanded={open}
          aria-controls="side-drawer-panel"
          aria-label={open ? 'Close contents' : 'Open contents'}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <path
              d={open ? 'M6.5 6.5l11 11M17.5 6.5l-11 11' : 'M4 7h16M4 12h16M4 17h16'}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {open && <div className="side-drawer__scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}

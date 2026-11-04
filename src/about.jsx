// Entry point for the About page: shared setup, then the side nav, built from the
// page's sections (each section's id and question).
import './base.js';

import { createRoot } from 'react-dom/client';
import SectionNav from './components/SectionNav.jsx';

const sections = [...document.querySelectorAll('.about-section')];
const items = sections.map((section) => ({
  id: section.id,
  label: section.querySelector('.about-section__title').textContent.trim(),
}));

const navRoot = document.getElementById('side-nav');
if (navRoot) createRoot(navRoot).render(<SectionNav items={items} />);

// Going to a section (from the side nav, a link or the address) opens it if it's closed.
const openTarget = () => {
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target instanceof HTMLDetailsElement) target.open = true;
};
window.addEventListener('hashchange', openTarget);
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (link && link.getAttribute('href') === location.hash) openTarget(); // same section clicked again
});
openTarget();

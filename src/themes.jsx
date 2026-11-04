// Entry point for the Themes & Factors page: shared setup, then the wheel, the side nav
// and the theme sections, all rendered from the indicator mapping data.
import './base.js';

import { createRoot } from 'react-dom/client';
import { ThemesNav, ThemeSections } from './components/ThemesGuide.jsx';
import ThemesWheel from './components/ThemesWheel.jsx';

const wheelRoot = document.getElementById('themes-wheel');
if (wheelRoot) createRoot(wheelRoot).render(<ThemesWheel />);

const navRoot = document.getElementById('themes-nav');
if (navRoot) createRoot(navRoot).render(<ThemesNav />);

const sectionsRoot = document.getElementById('theme-sections');
if (sectionsRoot) createRoot(sectionsRoot).render(<ThemeSections />);

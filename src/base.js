// Shared by every page: fonts, styles, the top navigation's behaviour and the load entrance.
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/rubik/latin-600.css';
import '@fontsource/rubik/latin-800.css';
// Rubik Doodle Shadow (the Vision title's shadow) is a subset declared in main.css.
import './styles/main.css';

import { initHeader } from './scripts/header.js';
import { initRise } from './scripts/rise.js';

// The site's scripts have started: keeps the JavaScript notice hidden (see each page's head).
document.documentElement.classList.add('js-ready');

initHeader();
initRise();

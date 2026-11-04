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

initHeader();
initRise();

// Entry point: styles, fonts, hero behaviour, and the React scenes/wheel.
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/rubik/latin-600.css';
import '@fontsource/rubik/latin-800.css';
import '@fontsource/rubik-doodle-shadow/latin-400.css';
import './styles/main.css';

import { createRoot } from 'react-dom/client';
import { initHero } from './scripts/hero.js';
import VisionExplorer from './components/VisionExplorer.jsx';

initHero();

const explorerRoot = document.getElementById('vision-explorer');
if (explorerRoot) createRoot(explorerRoot).render(<VisionExplorer />);

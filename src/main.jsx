// Entry point for the Vision page: shared setup, hero behaviour, and the React scenes/wheel.
import './base.js';

import { createRoot } from 'react-dom/client';
import { initHero } from './scripts/hero.js';
import VisionExplorer from './components/VisionExplorer.jsx';

initHero();

const explorerRoot = document.getElementById('vision-explorer');
if (explorerRoot) createRoot(explorerRoot).render(<VisionExplorer />);

// Hero behaviour (spec INT-01): elements marked [data-parallax="<factor>"] drift
// slightly with scroll, on larger screens with a mouse or trackpad (src/scripts/motion.js).
// (The load entrance, [data-rise], is shared: src/scripts/rise.js.)
// The "Scroll to journey…" prompt fades out once the first scene description shows, and
// back in when you scroll up and it hides again (the description's fade is in Scene.jsx).

import { scrollEffectsOff } from './motion.js';

export function initHero() {
  hidePromptWithFirstTitle();
  if (scrollEffectsOff()) return;

  const layers = [...document.querySelectorAll('[data-parallax]')];
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    for (const layer of layers) {
      layer.style.translate = `0 ${-y * Number(layer.dataset.parallax)}px`;
    }
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true },
  );
}

function hidePromptWithFirstTitle() {
  const prompt = document.querySelector('.hero-prompt');
  const explorer = document.getElementById('vision-explorer');
  if (!prompt || !explorer) return;

  // The scenes are drawn by React after this runs, so wait for the first title to appear.
  const watch = () => {
    const title = explorer.querySelector('.scene-title');
    if (!title) return false;
    const sync = () => (prompt.dataset.hidden = String(title.style.opacity === '1'));
    new MutationObserver(sync).observe(title, { attributes: true, attributeFilter: ['style'] });
    sync();
    return true;
  };
  if (watch()) return;
  const waiting = new MutationObserver(() => watch() && waiting.disconnect());
  waiting.observe(explorer, { childList: true, subtree: true });
}

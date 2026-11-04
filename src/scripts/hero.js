// Hero behaviour (spec INT-01): elements marked [data-parallax="<factor>"] drift
// slightly with scroll, on larger screens with a mouse or trackpad (src/scripts/motion.js).
// (The load entrance, [data-rise], is shared: src/scripts/rise.js.)

import { scrollEffectsOff } from './motion.js';

export function initHero() {
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

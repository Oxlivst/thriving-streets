// Hero behaviour (spec INT-01): elements marked [data-parallax="<factor>"] drift
// slightly with scroll. (The load entrance, [data-rise], is shared: src/scripts/rise.js.)

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHero() {
  if (reduceMotion) return;

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

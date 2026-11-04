// Hero behaviour (spec INT-01):
// - elements marked [data-rise] ease into place from a slight offset on load
// - elements marked [data-parallax="<factor>"] drift slightly with scroll

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHero() {
  const risers = document.querySelectorAll('[data-rise]');
  risers.forEach((el, i) => {
    el.style.setProperty('--rise-delay', `${150 + i * 160}ms`);
    el.classList.add('rise-in');
  });

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

// Hero behaviour (spec INT-01):
// - elements marked [data-rise] ease into place from a slight offset on load
// - elements marked [data-parallax="<factor>"] drift slightly with scroll

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The title's doodle shadow is set in a different font from the title, so its letters
// are slightly different widths and a single block offset drifts along each line.
// Instead, each shadow letter is centred on its title letter plus one fixed offset.
// From the Figma hero (title at 322, shadow at 316 / +7 at 84px), as a share of the font size,
// so it holds as the fluid title size changes.
const SHADOW_OFFSET_EM = { x: -6 / 84, y: 7 / 84 };

function alignTitleShadow(title, main, shadow, originalShadow) {
  // Start again from the shadow's own text (it is rebuilt from single letters below).
  shadow.innerHTML = originalShadow;
  delete shadow.dataset.aligned;
  const fontSize = parseFloat(getComputedStyle(title).fontSize);
  const SHADOW_OFFSET = { x: SHADOW_OFFSET_EM.x * fontSize, y: SHADOW_OFFSET_EM.y * fontSize };

  const letterBoxes = (el) => {
    const boxes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (let i = 0; i < node.length; i++) {
        if (!node.data[i].trim()) continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        boxes.push({ char: node.data[i], box: range.getBoundingClientRect() });
      }
    }
    return boxes;
  };

  const origin = title.getBoundingClientRect();
  const letters = letterBoxes(main);
  // Measure the shadow font's own letter widths, then lay the letters out one by one.
  const measure = shadow.cloneNode(true);
  measure.style.visibility = 'hidden';
  title.append(measure);
  const shadowLetters = letterBoxes(measure);
  measure.remove();
  if (shadowLetters.length !== letters.length) return;

  // Pass 1: centre each shadow letter on its title letter (the fonts' letter boxes differ in size).
  const spans = letters.map(({ char, box }, i) => {
    const span = document.createElement('span');
    span.className = 'hero-title__shadow-letter';
    span.textContent = char;
    const { width, height } = shadowLetters[i].box;
    span.style.left = `${box.left - origin.left + (box.width - width) / 2 + SHADOW_OFFSET.x}px`;
    span.style.top = `${box.top - origin.top + (box.height - height) / 2 + SHADOW_OFFSET.y}px`;
    return span;
  });
  shadow.replaceChildren(...spans);
  shadow.dataset.aligned = 'true';

  // Pass 2: the fonts sit differently inside their boxes, so measure where each
  // shadow letter actually landed and nudge it onto its exact target.
  const placed = letterBoxes(shadow);
  spans.forEach((span, i) => {
    const target = letters[i].box;
    const actual = placed[i].box;
    const dx = target.left + target.width / 2 + SHADOW_OFFSET.x - (actual.left + actual.width / 2);
    const dy = target.top + target.height / 2 + SHADOW_OFFSET.y - (actual.top + actual.height / 2);
    span.style.left = `${parseFloat(span.style.left) + dx}px`;
    span.style.top = `${parseFloat(span.style.top) + dy}px`;
  });
}

export function initHero() {
  const title = document.querySelector('.hero-title');
  const main = title?.querySelector('.hero-title__main');
  const shadow = title?.querySelector('.hero-title__shadow');
  if (main && shadow) {
    const originalShadow = shadow.innerHTML;
    const align = () => alignTitleShadow(title, main, shadow, originalShadow);
    // Align once the fonts are in, and again whenever the title's size changes (fluid type).
    document.fonts.ready.then(() => {
      align();
      let lastWidth = title.offsetWidth;
      new ResizeObserver(() => {
        if (title.offsetWidth === lastWidth) return;
        lastWidth = title.offsetWidth;
        align();
      }).observe(title);
    });
  }

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

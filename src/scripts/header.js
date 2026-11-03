// Top navigation behaviour.
// - See-through over the hero's tint; white once the page scrolls (data-scrolled).
// - Slides away when scrolling down; comes back when scrolling up (data-hidden).
// - While hidden, pointing at a thin strip along the top of the window, or
//   tabbing into the nav, brings it back.
// - Other scripts can pin it open with data-pinned="true" (e.g. the focus view).

const HIDE_AFTER_PX = 120; // never hide while near the top of the page
const DIRECTION_TOLERANCE_PX = 6; // ignore tiny scroll jitters
const REVEAL_STRIP_PX = 24; // height of the hover strip that reveals the nav
const HIDE_DELAY_MS = 400; // after the pointer leaves a revealed nav

export function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastY = window.scrollY;
  let scrolledDown = false; // what the last scroll direction asks for
  let pointerOver = false; // pointer on the strip or the nav
  let hideTimer = 0;

  // The single place that decides visibility.
  const apply = () => {
    const keepShown = header.dataset.pinned === 'true' || pointerOver || header.matches(':focus-within');
    header.dataset.hidden = String(scrolledDown && !keepShown);
  };

  const onScroll = () => {
    const y = window.scrollY;
    header.dataset.scrolled = String(y > 4);
    if (y < HIDE_AFTER_PX) scrolledDown = false;
    else if (y > lastY + DIRECTION_TOLERANCE_PX) scrolledDown = true;
    else if (y < lastY - DIRECTION_TOLERANCE_PX) scrolledDown = false;
    else return; // small movement: keep the current state and reference point
    lastY = y;
    apply();
  };

  // Hover strip: an invisible band along the top edge of the window.
  const strip = document.createElement('div');
  strip.className = 'nav-reveal-strip';
  strip.style.height = `${REVEAL_STRIP_PX}px`;
  strip.setAttribute('aria-hidden', 'true');
  document.body.prepend(strip);

  const enter = () => {
    clearTimeout(hideTimer);
    pointerOver = true;
    apply();
  };
  const leave = (e) => {
    if (header.contains(e.relatedTarget) || e.relatedTarget === strip) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      pointerOver = false;
      apply();
    }, HIDE_DELAY_MS);
  };
  for (const el of [strip, header]) {
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
  }

  // Keyboard: tabbing into the nav shows it; tabbing out lets it hide again.
  header.addEventListener('focusin', apply);
  header.addEventListener('focusout', () => setTimeout(apply));

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

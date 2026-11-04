// Page-load entrance, on every page: elements marked [data-rise] ease into place from
// a slight offset, one after another (the .rise-in animation in main.css).
// Don't put it on anything that holds a position: fixed element (e.g. the side nav and its
// drawer): while it animates, it becomes the frame the fixed element is placed in.
export function initRise() {
  document.querySelectorAll('[data-rise]').forEach((el, i) => {
    el.style.setProperty('--rise-delay', `${150 + i * 160}ms`);
    el.classList.add('rise-in');
  });
}

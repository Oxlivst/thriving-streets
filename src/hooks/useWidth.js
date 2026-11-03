import { useLayoutEffect, useState } from 'react';

// Width (and height) of an element, kept up to date (0 until it is measured).
// Returns [ref, width, height]: pass `ref` as the element's ref. It follows the element
// even when React swaps it for another one (e.g. the focus view's grid ↔ drawer).
export default function useWidth() {
  const [el, ref] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!el) return;
    setSize({ width: el.clientWidth, height: el.clientHeight });
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [ref, size.width, size.height];
}

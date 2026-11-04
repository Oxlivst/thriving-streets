import { useEffect, useState } from 'react';
import { DRAWER_BELOW } from '../config/layout.js';

// True while the window is narrower than `below` (default: the drawer breakpoint).
export default function useNarrow(below = DRAWER_BELOW) {
  const query = `(max-width: ${below - 0.02}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return narrow;
}

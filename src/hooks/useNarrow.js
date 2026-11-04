import { useEffect, useState } from 'react';
import { DRAWER_BELOW } from '../config/layout.js';

// True while the window is narrower than the drawer breakpoint.
export default function useNarrow() {
  const query = `(max-width: ${DRAWER_BELOW - 0.02}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return narrow;
}

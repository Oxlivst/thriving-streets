// WheelHelp: the ? beside the wheel. Hover (mouse) or tap (touch, pen, keyboard) opens it
// into a pill with a line about the wheel and a link to the Themes & Factors page.

import { useEffect, useRef, useState } from 'react';
import { WHEEL_EXPAND_ALL } from '../config/themes.js';

const TOUCH_WINDOW_MS = 1000; // a click this soon after a touch on the help pill is that tap

export default function WheelHelp({ maxWidth }) {
  const [helpOpen, setHelpOpen] = useState(false); // tapped open (touch); hover and focus open it via CSS
  const helpRef = useRef(null);
  const [helpInput, setHelpInput] = useState('mouse'); // how the pill was last pressed: mouse, pen or touch
  const lastTouch = useRef(-Infinity); // when a finger last touched the pill
  // While it's tapped open, a tap anywhere outside the pill closes it.
  useEffect(() => {
    if (!helpOpen) return;
    const onPointerDown = (e) => {
      if (!helpRef.current?.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, { capture: true });
    };
  }, [helpOpen]);

  return (
    <>
      {/* Touch and keyboard: a tap anywhere on the pill (except its link) opens or closes it,
        and a tap outside closes it. Mouse: hover does it (CSS), so clicks are ignored. */}
      <div
        ref={helpRef}
        className="focus-help"
        data-open={helpOpen}
        data-input={helpInput}
        style={{ '--hint-max': `${maxWidth}px` }}
        // Browsers don't reliably say how a click was made (iPad Safari and Chrome report
        // taps as mouse clicks), so a finger is recognised by the touch events every
        // touch screen sends first, and pointerdown covers pens.
        onTouchStart={() => {
          lastTouch.current = performance.now();
          setHelpInput('touch');
        }}
        onPointerDown={(e) => {
          if (performance.now() - lastTouch.current > TOUCH_WINDOW_MS) setHelpInput(e.pointerType || 'mouse');
        }}
        onClick={(e) => {
          if (e.target.closest('a')) return;
          const keyboard = e.detail === 0;
          const touch = performance.now() - lastTouch.current < TOUCH_WINDOW_MS;
          const pen = e.nativeEvent.pointerType === 'pen';
          if (!keyboard && !touch && !pen) return; // mouse: hover does it
          setHelpOpen((open) => !open);
        }}
      >
        <button
          type="button"
          className="focus-help__toggle"
          aria-expanded={helpOpen}
          aria-controls="focus-hint"
          aria-label={helpOpen ? 'Hide help' : 'How to use the wheel'}
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8v.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.9" r="1.05" fill="currentColor" />
          </svg>
        </button>
        <p id="focus-hint" className="focus-help__text">
          {/* Laid out once at full width; the pill reveals it as it widens (no re-wrapping). */}
          <span className="focus-help__inner">
            {WHEEL_EXPAND_ALL
              ? 'Use the arrows to move between experiences. '
              : 'The wheel shows the themes & factors supporting this indicator. '}
            <a href="./themes.html" target="_blank" rel="noopener" className="focus-help__link">
              Learn more
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="sr-only"> about the themes and factors (opens in a new tab)</span>
            </a>
          </span>
        </p>
      </div>
    </>
  );
}

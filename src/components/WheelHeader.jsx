// WheelHeader: the row above the wheel on the scroll homepage. The ? (help) on the left,
// then a bar with the indicator's number and a ↑ button, then a ↓ button. ↑ / ↓ move one
// indicator at a time, as scrolling does. The help opens over the bar.
// Colours: the bar is Background-secondary; the round buttons are Background-tertiary.
// Phones show only the ? (main.css).

import WheelHelp from './WheelHelp.jsx';

const BUTTON = 48; // the round buttons' size, and the row's height

function Chevron({ up }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path
        d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WheelHeader({ number, total, width, onPrev, onNext, hasPrev, hasNext }) {
  return (
    <div className="wheel-header" style={{ width }}>
      {/* The ? keeps its place; opened, its help pill spreads over the bar. */}
      <div className="wheel-header__help">
        <WheelHelp maxWidth={Math.max(160, width - BUTTON)} />
      </div>
      <div className="wheel-header__bar">
        <p className="wheel-header__label">
          <span aria-hidden="true">
            Indicator #{number}/{total}
          </span>
          <span className="sr-only">
            Indicator {number} of {total}
          </span>
        </p>
        <button type="button" className="wheel-header__button" onClick={onPrev} disabled={!hasPrev} aria-label="Previous indicator">
          <Chevron up />
        </button>
      </div>
      <button type="button" className="wheel-header__button" onClick={onNext} disabled={!hasNext} aria-label="Next indicator">
        <Chevron />
      </button>
    </div>
  );
}

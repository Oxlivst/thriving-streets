// IndicatorModal: an indicator's wheel in a dialog over the page (Enabling factors page,
// opened from the drawings under each factor). It opens on the theme the drawing was
// clicked under. Esc, the ×, or a click outside closes it.
// Figma: file GgTp2DtbW3z0L5GG4Leabb, node 1667:124.

import { useEffect, useRef } from 'react';
import IndicatorWheel from './IndicatorWheel.jsx';
import useWidth from '../hooks/useWidth.js';

const WHEEL_BOX = { width: 600, height: 700 }; // IndicatorWheel's own coordinate box
const WHEEL_DRAWN = { top: 50, height: 640 }; // ring top to the bottom of a third factor band

export default function IndicatorModal({ indicator, theme, onClose }) {
  const dialog = useRef(null);
  const [measure, width] = useWidth();

  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);

  // Fit the wheel to the dialog's width and the window's height.
  const scale = width ? Math.min(1, (width - 32) / WHEEL_BOX.width, (window.innerHeight - 140) / WHEEL_DRAWN.height) : 0;

  return (
    <dialog
      ref={dialog}
      className="indicator-modal"
      aria-label={indicator.text}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()} // a click on the backdrop
    >
      <div ref={measure} className="relative px-4 pt-20 pb-6">
        <button type="button" className="focus-close indicator-modal__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        {scale > 0 && (
          <div
            className="relative mx-auto overflow-hidden"
            style={{
              width: WHEEL_BOX.width * scale,
              height: (WHEEL_DRAWN.top + WHEEL_DRAWN.height) * scale,
              marginTop: -WHEEL_DRAWN.top * scale,
            }}
          >
            <div
              className="origin-top-left"
              style={{ width: WHEEL_BOX.width, height: WHEEL_BOX.height, transform: `scale(${scale})` }}
            >
              <IndicatorWheel indicator={indicator} startTheme={theme} hasPrev={false} hasNext={false} />
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

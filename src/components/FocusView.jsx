// FocusView (spec §7.1, INT-04/06/07/08)
//
// A fixed layer under the top nav, shown while an indicator is selected.
// Layout from the Figma frame "Landing page-the vision-selected" (1440px):
//   left  — all scenes at 560px, column centred 323px left of the page centre;
//           this pane scrolls, the page behind does not
//   right — the wheel, fixed; its pane scrolls only if the window is too short
//   close — × button, top right; Esc does the same

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scenes } from '../config/scenes.js';
import Scene from './Scene.jsx';
import IndicatorWheel from './IndicatorWheel.jsx';

// Where a scene title sits in the viewport in the focus view (Figma: 188px; tightened to 156px).
export const FOCUS_TITLE_TOP = 156;
const NAV_HEIGHT = 60;
const SCENE_SCALE = 0.875; // 640px → 560px
const COLUMN_SHIFT = 323; // column centre: page centre − 323px
const WHEEL_LEFT = 38; // wheel box: page centre + 38px
const WHEEL_TOP = 51; // wheel box top below the nav; moves with FOCUS_TITLE_TOP (ring centre at 411px)
const SWAP_MS = 900; // matches --duration-move

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function FocusView({ indicatorsByNumber, selected, startAt, hovered, onHover, onSelect, onPrev, onNext, onClose }) {
  const dialogRef = useRef(null);
  const leftPane = useRef(null);
  const sceneRefs = useRef(new Map());
  const [closing, setClosing] = useState(false);

  // Wheels on stage: the current one, plus the previous one while it leaves.
  const [wheels, setWheels] = useState([{ number: selected, startAt, key: `${selected}`, state: 'in' }]);
  useEffect(() => {
    setWheels((prev) => {
      if (prev.at(-1)?.number === selected) return prev;
      return [
        ...prev.filter((w) => w.state === 'in').map((w) => ({ ...w, state: 'out' })),
        { number: selected, startAt, key: `${selected}-${Date.now()}`, state: 'in' },
      ];
    });
    const t = setTimeout(() => setWheels((prev) => prev.filter((w) => w.state === 'in')), SWAP_MS);
    return () => clearTimeout(t);
  }, [selected, startAt]);

  // Freeze the page behind; focus the dialog.
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    dialogRef.current.focus({ preventScroll: true });
    return () => {
      html.style.overflow = previous;
    };
  }, []);

  // Keep the selected indicator's scene in view in the left pane:
  // instantly on open, smoothly when the selection moves to another scene.
  const firstScroll = useRef(true);
  const activeScene = scenes.find((s) => s.slots.some((slot) => slot.indicator === selected));
  useLayoutEffect(() => {
    const el = sceneRefs.current.get(activeScene?.id);
    if (!el) return;
    const top = el.offsetTop - (FOCUS_TITLE_TOP - NAV_HEIGHT);
    leftPane.current.scrollTo({ top, behavior: firstScroll.current || reduceMotion() ? 'instant' : 'smooth' });
    firstScroll.current = false;
  }, [activeScene]);

  const requestClose = () => {
    if (closing) return;
    if (reduceMotion()) return onClose();
    setClosing(true);
    setTimeout(onClose, 450);
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <div
      ref={dialogRef}
      className={`focus-view fixed inset-x-0 bottom-0 z-20 outline-none ${closing ? 'focus-view--closing' : ''}`}
      style={{ top: NAV_HEIGHT }}
      role="dialog"
      aria-modal="true"
      aria-label={indicatorsByNumber.get(selected).text}
      tabIndex={-1}
    >
      {/* ----- Left: scenes (scrolls) ----- */}
      <div
        ref={leftPane}
        className="absolute inset-y-0 left-0 overflow-y-auto overscroll-contain"
        style={{ width: `calc(50% + ${WHEEL_LEFT}px)` }}
      >
        <div
          className="focus-scenes flex flex-col"
          style={{
            width: 640 * SCENE_SCALE,
            marginLeft: `max(24px, calc(50vw - ${COLUMN_SHIFT + (640 * SCENE_SCALE) / 2}px))`,
            paddingTop: FOCUS_TITLE_TOP - NAV_HEIGHT,
            paddingBottom: '60vh',
            gap: 72 * SCENE_SCALE,
          }}
        >
          {scenes.map((scene) => (
            <div key={scene.id} ref={(el) => sceneRefs.current.set(scene.id, el)}>
              <Scene
                scene={scene}
                scale={SCENE_SCALE}
                indicatorsByNumber={indicatorsByNumber}
                selected={selected}
                hovered={hovered}
                onHover={onHover}
                onSelect={onSelect}
                onDismiss={requestClose}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ----- Right: wheel (fixed; scrolls only if the window is too short) ----- */}
      <div
        className="absolute inset-y-0 right-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        style={{ left: `calc(50% + ${WHEEL_LEFT}px)` }}
      >
        <div className="relative h-[700px] w-[600px]" style={{ marginTop: WHEEL_TOP, marginBottom: 24 }}>
          {wheels.map((wheel) => (
            <div key={wheel.key} className={`absolute inset-0 ${wheel.state === 'in' ? 'wheel-in' : 'wheel-out'}`}>
              <IndicatorWheel
                indicator={indicatorsByNumber.get(wheel.number)}
                startAt={wheel.startAt}
                onPrev={onPrev}
                onNext={onNext}
                hasPrev={Boolean(onPrev)}
                hasNext={Boolean(onNext)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ----- Close ----- */}
      <button type="button" className="focus-close" onClick={requestClose} aria-label="Close and return to the page">
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}

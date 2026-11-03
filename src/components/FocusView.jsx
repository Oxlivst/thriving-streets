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
import IndicatorWheel, { RING_RADIUS } from './IndicatorWheel.jsx';
import { WHEEL_EXPAND_ALL } from '../config/themes.js';

// Vertical layout of the focus view, in px from the top of the window (1440 frame):
// the helper pill and × sit in a row centred at HEADER_CENTRE_Y, and the scene title
// lines up with that row when the scenes are scrolled to the top (the default).
const NAV_HEIGHT = 60;
const HEADER_CENTRE_Y = 125; // design: 195, moved up 70px
const HEADER_HEIGHT = 48;
export const FOCUS_TITLE_TOP = HEADER_CENTRE_Y - 13.5; // scene title (27px line) centred on the row
// The ring's top edge sits on the header row's centre line (through the scene title
// and the ? / × buttons), the same for every indicator. Outer arcs, when the theme
// at the top has any, sit just above it in the empty space left of the buttons.
const RING_CENTRE_Y = HEADER_CENTRE_Y + RING_RADIUS;
const SCENE_SCALE = 0.75; // 640px → 480px (Figma: 0.875 → 560px)
const COLUMN_SHIFT = 323; // column centre: page centre − 323px
const WHEEL_LEFT = 38; // wheel box: page centre + 38px
const PANE_PAD = 48; // extra room on the wheel pane's left so the (wider) pill row isn't clipped
const WHEEL_TOP = RING_CENTRE_Y - NAV_HEIGHT - 300; // the wheel box is 600px with its centre at 300
const HINT = WHEEL_EXPAND_ALL
  ? 'Use the arrows to move between indicators'
  : 'Rotate the wheel to explore the enabling factors for the experience';
const SWAP_MS = 900; // matches --duration-move
const WHEEL_STEP_PX = 70; // scroll distance that switches indicator

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function FocusView({ indicatorsByNumber, selected, startAt, hovered, onHover, onSelect, onPrev, onNext, onClose }) {
  const dialogRef = useRef(null);
  const leftPane = useRef(null);
  const rightPane = useRef(null);
  const sceneRefs = useRef(new Map());
  const [closing, setClosing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false); // help pill starts collapsed each time

  // Wheels on stage: the current one, plus the previous one while it leaves.
  const [wheels, setWheels] = useState([{ number: selected, startAt, key: `${selected}`, state: 'in' }]);
  useEffect(() => {
    setWheels((prev) => {
      if (prev.at(-1)?.number === selected) return prev;
      return [
        // Moving forward: the new wheel rises from below and the old one leaves upwards; back: the reverse.
        ...prev.filter((w) => w.state === 'in').map((w) => ({ ...w, state: 'out', dir: selected > prev.at(-1).number ? 'down' : 'up' })),
        { number: selected, startAt, key: `${selected}-${Date.now()}`, state: 'in', dir: selected > prev.at(-1).number ? 'down' : 'up' },
      ];
    });
    const t = setTimeout(() => setWheels((prev) => prev.filter((w) => w.state === 'in')), SWAP_MS);
    return () => clearTimeout(t);
  }, [selected, startAt]);

  // Freeze the page behind; keep the nav shown (this view starts right below it); focus the dialog.
  useEffect(() => {
    const html = document.documentElement;
    const header = document.querySelector('.site-header');
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    if (header) {
      header.dataset.pinned = 'true';
      header.dataset.hidden = 'false';
    }
    dialogRef.current.focus({ preventScroll: true });
    return () => {
      html.style.overflow = previous;
      if (header) header.dataset.pinned = 'false';
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

  // Scrolling over the wheel's pane moves to the previous / next indicator: one step per
  // gesture (a trackpad's momentum doesn't skip ahead).
  const stepRef = useRef({ onPrev, onNext });
  stepRef.current = { onPrev, onNext };
  useEffect(() => {
    const pane = rightPane.current;
    let total = 0;
    let lastEvent = 0;
    let lockedUntil = 0;
    const onWheel = (e) => {
      // If part of the drawn wheel is out of view (short windows), scroll the pane first;
      // only switch indicator once the wheel is fully in view in that direction.
      const down = e.deltaY > 0;
      const wheel = [...pane.querySelectorAll('[aria-roledescription="indicator wheel"]')].pop();
      const svg = wheel?.querySelector(':scope > div > svg'); // the wheel drawing (not the arrow icons)
      const drawnBottom = svg ? svg.getBoundingClientRect().top + 300 + svg.getBBox().y + svg.getBBox().height : 0;
      const canScrollPane = down ? drawnBottom > pane.getBoundingClientRect().bottom + 1 : pane.scrollTop > 0;
      if (canScrollPane) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastEvent > 250) total = 0; // a new gesture
      lastEvent = now;
      if (now < lockedUntil) {
        lockedUntil = Math.max(lockedUntil, now + 250); // still the same gesture's momentum
        return;
      }
      total += e.deltaY;
      if (Math.abs(total) < WHEEL_STEP_PX) return;
      const step = total > 0 ? stepRef.current.onNext : stepRef.current.onPrev;
      total = 0;
      lockedUntil = now + SWAP_MS; // let the swap finish before the next one
      step?.();
    };
    pane.addEventListener('wheel', onWheel, { passive: false });
    return () => pane.removeEventListener('wheel', onWheel);
  }, []);

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

      {/* ----- Right: wheel (top-aligned with the illustrations; scrolls only if the window is too short) ----- */}
      <div
        ref={rightPane}
        className="absolute inset-y-0 right-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        style={{ left: `calc(50% + ${WHEEL_LEFT - PANE_PAD}px)`, paddingLeft: PANE_PAD }}
      >

        <div className="relative h-[700px] w-[600px]" style={{ marginTop: WHEEL_TOP, marginBottom: 24 }}>
          {wheels.map((wheel) => (
            <div key={wheel.key} className={`absolute inset-0 wheel-${wheel.state}`} data-dir={wheel.dir ?? 'down'}>
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

      {/* Help (?) and close (×), right-aligned to the wheel's box and fixed
          (they don't scroll with the wheel pane). The help button
          expands leftwards into a pill with the hint; click again to collapse. */}
      <div
        className="absolute z-10 flex -translate-x-full items-center gap-4"
        style={{ left: `calc(50% + ${WHEEL_LEFT + 600}px)`, top: HEADER_CENTRE_Y - NAV_HEIGHT - HEADER_HEIGHT / 2, height: HEADER_HEIGHT }}
      >
        <button
          type="button"
          className="focus-help"
          aria-expanded={helpOpen}
          aria-label={helpOpen ? `Hide help: ${HINT}` : 'How to use the wheel'}
          onClick={() => setHelpOpen((open) => !open)}
        >
          <span className="flex size-12 shrink-0 items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-6">
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
          </span>
          <span className="focus-help__text" aria-hidden={!helpOpen}>
            {HINT}
          </span>
        </button>
        <button type="button" className="focus-close" onClick={requestClose} aria-label="Close and return to the page">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}

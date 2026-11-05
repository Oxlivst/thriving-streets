// FocusView (spec §7.1, INT-04/06/07/08)
//
// A fixed layer under the top nav, shown while an indicator is selected.
// Layout: a 6-column grid (24px gutters), at most 1200px wide.
//   columns 1–3 — the scenes
//   columns 4–6 — the wheel, with help (?) at its left and close (×) at its right
// Both halves scale with the grid down to 960px. Narrower than that (tablets and
// phones), the selected indicator's scene sits above the wheel, both held still together.
//
// Scrolling works like a scrollytelling page: the view scrolls natively (no scroll
// hijacking). Each indicator owns STEP_PX of scroll; while its scene's indicators are
// stepped through, the scene and the wheel stay put (sticky), and the indicator whose
// step is current is selected. The wheel crossfades between indicators. Clicks,
// arrows and ↑ / ↓ scroll smoothly to the chosen indicator's step. Each step is also a
// native scroll-snap point with `scroll-snap-stop: always`, so one trackpad stroke
// settles on the next indicator instead of flying past several (the browser still scrolls).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scenes, SCENE_BOX } from '../config/scenes.js';
import Scene from './Scene.jsx';
import IndicatorWheel, { RING_RADIUS } from './IndicatorWheel.jsx';
import { WHEEL_EXPAND_ALL } from '../config/themes.js';
import useWidth from '../hooks/useWidth.js';
import useNarrow from '../hooks/useNarrow.js';

// Vertical layout, in px from the top of the window: the scene title and the
// ? / × buttons share a centre line at HEADER_CENTRE_Y, and the wheel's ring
// starts on that line.
const NAV_HEIGHT = 60;
const HEADER_CENTRE_Y = 125;
const HEADER_HEIGHT = 48;
export const FOCUS_TITLE_TOP = HEADER_CENTRE_Y - 13.5; // scene title (27px line) centred on the row
const STICKY_TOP = FOCUS_TITLE_TOP - NAV_HEIGHT; // where a scene holds still, inside this view

const TOUCH_WINDOW_MS = 1000; // a click this soon after a touch on the help pill is that tap
const GRID_MAX = 1200; // the two halves together
const GRID_GUTTER = 24;
const WHEEL_BOX = { width: 600, height: 700 }; // IndicatorWheel's own coordinate box (centre at 300, 300)
const WHEEL_DRAWN_HEIGHT = 640; // ring top to the bottom of a third factor band, at scale 1
// Beside the wheel, the scene is drawn at 80% of its column (left-aligned), so the
// illustration is a touch narrower than the wheel's ring, as in Figma (node 1541:65628).
const SCENE_FIT = 0.8;

const STEP_PX = 480; // scroll distance per indicator (the BBC example uses about this)
// A new wheel appears this far off its resting angle and eases into place before its
// factors come out (a hint that the wheel turns).
const SETTLE_DEG = 14;
const STACK_GAP = 32; // below 960px: space between the nav and the scene's title
const FADE_MS = 600; // wheel crossfade (the longer of the in / out animations)
const SMOOTH_SCROLL_MAX_MS = 1500; // a programmatic smooth scroll is assumed done after this

// Each scene's indicators, in the order scrolling steps through them.
const SCENE_STEPS = scenes.map((scene) => ({
  scene,
  indicators: scene.slots.map((slot) => slot.indicator).sort((a, b) => a - b),
}));

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function FocusView({ indicatorsByNumber, selected, hovered, onHover, onSelect, onPrev, onNext, onClose }) {
  const dialogRef = useRef(null);
  const scroller = useRef(null);
  const blockRefs = useRef(new Map()); // scene id → its block in the scroll track
  const [closing, setClosing] = useState(false);
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
  const narrow = useNarrow(); // below DRAWER_BELOW (src/config/layout.js): the scene sits above the wheel

  // Scale the scenes and the wheel to the room they actually have.
  const [measureScroller, , paneHeight] = useWidth();
  const [measureScenes, sceneColumnWidth] = useWidth();
  const [measureWheel, wheelColumnWidth] = useWidth();
  const scrollerRef = useCallback(
    (el) => {
      scroller.current = el;
      measureScroller(el);
    },
    [measureScroller],
  );
  const sceneScale = sceneColumnWidth ? Math.min(1, (sceneColumnWidth * SCENE_FIT) / SCENE_BOX.width) : 0.75;
  const sceneHeight = 27 + 24 + SCENE_BOX.height * sceneScale; // title, gap, illustration
  // Below 960px: the selected indicator's scene sits above the wheel, held still with it.
  // It takes up to 46% of the height (title, gap, illustration); the wheel gets the rest.
  const stackSceneScale =
    narrow && wheelColumnWidth
      ? Math.min(wheelColumnWidth / SCENE_BOX.width, Math.max(0.25, (paneHeight * 0.46 - 72 - STACK_GAP) / SCENE_BOX.height))
      : 0;
  const stackSceneHeight = narrow ? STACK_GAP + 48 + 24 + SCENE_BOX.height * stackSceneScale : 0;
  // The ? / × row's centre line, from the top of the wheel column: the ring starts on it.
  const headerLine = narrow ? stackSceneHeight + 8 + HEADER_HEIGHT / 2 : HEADER_CENTRE_Y - NAV_HEIGHT;
  // The wheel fits its column's width, and the window's height (it no longer scrolls on its own).
  const wheelRoom = paneHeight - headerLine - 16;
  const wheelScale = Math.min(
    1,
    wheelColumnWidth ? wheelColumnWidth / WHEEL_BOX.width : 1,
    paneHeight ? wheelRoom / WHEEL_DRAWN_HEIGHT : 1,
  );
  const wheelTop = headerLine + RING_RADIUS * wheelScale - (WHEEL_BOX.height / 2 - 50) * wheelScale; // box centre is 300 of 700
  const hintMaxWidth = Math.max(160, wheelColumnWidth - HEADER_HEIGHT * 2 - 16);
  const stickyTop = narrow ? 0 : STICKY_TOP;

  // Wheels on stage: the current one, plus the previous one while it fades out.
  // Moving on (scrolling down), the new wheel rises in and the old one drifts up; back: the reverse.
  const [wheels, setWheels] = useState([{ number: selected, key: `${selected}`, state: 'in', dir: 'down' }]);
  useEffect(() => {
    setWheels((prev) => {
      if (prev.at(-1)?.number === selected) return prev;
      const dir = selected > prev.at(-1).number ? 'down' : 'up';
      return [
        ...prev.filter((w) => w.state === 'in').map((w) => ({ ...w, state: 'out', dir })),
        { number: selected, key: `${selected}-${Date.now()}`, state: 'in', dir },
      ];
    });
    const t = setTimeout(() => setWheels((prev) => prev.filter((w) => w.state === 'in')), FADE_MS);
    return () => clearTimeout(t);
  }, [selected]);

  // Screen readers: say which indicator is now showing when it changes (not on opening,
  // when the dialog's own name says it).
  const [announcement, setAnnouncement] = useState('');
  const openedWith = useRef(selected);
  useEffect(() => {
    if (selected !== openedWith.current) setAnnouncement(`Showing: ${indicatorsByNumber.get(selected).text}`);
  }, [selected, indicatorsByNumber]);

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

  // Scroll position of each indicator's step: where its scene's block reaches the
  // sticky line, plus one STEP_PX per indicator before it in that scene.
  const stepPositions = useCallback(() => {
    const box = scroller.current;
    const origin = box.getBoundingClientRect().top - box.scrollTop;
    return SCENE_STEPS.flatMap(({ scene, indicators }) => {
      const block = blockRefs.current.get(scene.id);
      if (!block) return [];
      const top = block.getBoundingClientRect().top - origin - stickyTop;
      return indicators.map((number, i) => ({ number, at: top + i * STEP_PX }));
    });
  }, [stickyTop]);

  // Scrolling selects the indicator whose step is current (past the halfway mark).
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const fromScroll = useRef(null); // a selection the scroll position made (needs no scrolling)
  const programmatic = useRef(0); // until when a smooth scroll we started is still running
  useEffect(() => {
    const box = scroller.current;
    // Measured once, and again only when the view or its content changes size, so a scroll
    // event never has to work out the layout (which made scrolling stutter on phones).
    let steps = stepPositions();
    const remeasure = new ResizeObserver(() => {
      steps = stepPositions();
    });
    remeasure.observe(box);
    if (box.firstElementChild) remeasure.observe(box.firstElementChild);
    const onScroll = () => {
      if (performance.now() < programmatic.current) return;
      const y = box.scrollTop;
      let current = null;
      for (const step of steps) if (current === null || step.at <= y + STEP_PX / 2) current = step.number;
      if (current !== null && current !== selectedRef.current) {
        fromScroll.current = current;
        onSelectRef.current(current);
      }
    };
    const onScrollEnd = () => {
      programmatic.current = 0;
    };
    box.addEventListener('scroll', onScroll, { passive: true });
    box.addEventListener('scrollend', onScrollEnd);
    return () => {
      remeasure.disconnect();
      box.removeEventListener('scroll', onScroll);
      box.removeEventListener('scrollend', onScrollEnd);
    };
  }, [stepPositions]);

  // A selection made any other way (click, arrows, keys, opening): scroll to its step,
  // instantly on open, smoothly afterwards.
  const firstScroll = useRef(true);
  useLayoutEffect(() => {
    if (fromScroll.current === selected) {
      fromScroll.current = null;
      return;
    }
    const step = stepPositions().find((s) => s.number === selected);
    if (!step) return;
    const instant = firstScroll.current || reduceMotion();
    firstScroll.current = false;
    if (!instant) programmatic.current = performance.now() + SMOOTH_SCROLL_MAX_MS;
    scroller.current.scrollTo({ top: step.at, behavior: instant ? 'instant' : 'smooth' });
  }, [selected, narrow, stepPositions]);

  // The selected indicator's scene (shown above the wheel below 960px).
  const activeScene = scenes.find((s) => s.slots.some((slot) => slot.indicator === selected));

  const requestClose = () => {
    if (closing) return;
    if (reduceMotion()) return onClose();
    setClosing(true);
    setTimeout(onClose, 450);
  };
  // The same function on every render, so the (memoised) scenes don't re-render for it.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const dismiss = useCallback(() => requestCloseRef.current(), []);

  // Esc closes the focus view. Tab and Shift+Tab stay inside it (it covers the page), so
  // keyboard focus doesn't slip to the nav or the page behind it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      const items = [...dialog.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.disabled && !el.closest('[inert], [aria-hidden="true"]') && el.getClientRects().length,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      const inside = dialog.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sceneProps = {
    indicatorsByNumber,
    selected,
    hovered,
    onHover,
    onSelect,
    onDismiss: dismiss,
  };

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
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* ----- The view's one scroll ----- */}
      {/* No scroll anchoring: with sticky content it would nudge the scroll position on every
          re-render, which here selects the next indicator, and so on. */}
      <div
        ref={scrollerRef}
        className="focus-scroller absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]"
        style={{ scrollPaddingTop: stickyTop }}
      >
        {/* The 6-column grid */}
        <div
          className="mx-auto grid grid-cols-6"
          style={{
            maxWidth: GRID_MAX + 2 * 32,
            columnGap: GRID_GUTTER,
            paddingInline: 32,
          }}
        >
          {/* Columns 1–3: one block per scene. The scene holds still (sticky) while its
              indicators are stepped through, then scrolls away. Below 960px the
              blocks are empty and only make the scroll track. */}
          <div
            ref={narrow ? undefined : measureScenes}
            className={`col-start-1 row-start-1 ${narrow ? 'col-span-6' : 'focus-scenes focus-scenes--beside col-span-3'}`}
            style={{
              '--column-width': `${sceneColumnWidth}px`,
              paddingTop: stickyTop,
              paddingBottom: Math.max(0, paneHeight - (narrow ? STEP_PX : stickyTop + sceneHeight)),
            }}
          >
            {SCENE_STEPS.map(({ scene, indicators }, i) => (
              <div
                key={scene.id}
                ref={(el) => blockRefs.current.set(scene.id, el)}
                className="relative"
                style={{ marginTop: i ? 72 * sceneScale : 0 }}
              >
                {/* Snap points, one per indicator step */}
                {indicators.map((number, step) => (
                  <span key={number} className="focus-snap" style={{ top: step * STEP_PX }} aria-hidden="true" />
                ))}
                {narrow ? (
                  <div style={{ height: indicators.length * STEP_PX }} />
                ) : (
                  <>
                    <div className="sticky flex flex-col items-start" style={{ top: stickyTop }}>
                      <Scene scene={scene} scale={sceneScale} {...sceneProps} />
                    </div>
                    <div style={{ height: (indicators.length - 1) * STEP_PX }} />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Columns 4–6 (or all six below 960px): the scene (below 960px), help, close and the wheel, held still */}
          <div
            ref={measureWheel}
            className={`sticky top-0 row-start-1 self-start ${narrow ? 'col-span-6 col-start-1 mx-auto w-full max-w-[600px]' : 'col-span-3 col-start-4'}`}
            style={{ height: paneHeight || '100%' }}
          >
            {/* Below 960px: the selected indicator's scene, above the wheel */}
            {narrow && activeScene && (
              <div
                className="focus-stack__scene"
                style={{ height: stackSceneHeight, '--column-width': `${wheelColumnWidth}px`, '--stack-gap': `${STACK_GAP}px` }}
              >
                <Scene scene={activeScene} scale={stackSceneScale} {...sceneProps} />
              </div>
            )}

            {/* ? at the wheel's left, × at its right.
              The help button expands rightwards into a pill with the hint. */}
            <div
              className="absolute inset-x-0 z-10 flex items-start justify-between gap-4"
              style={{
                top: headerLine - HEADER_HEIGHT / 2,
                minHeight: HEADER_HEIGHT,
              }}
            >
              {/* Touch and keyboard: a tap anywhere on the pill (except its link) opens or closes it,
                  and a tap outside closes it. Mouse: hover does it (CSS), so clicks are ignored. */}
              <div
                ref={helpRef}
                className="focus-help"
                data-open={helpOpen}
                data-input={helpInput}
                style={{ '--hint-max': `${hintMaxWidth}px` }}
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
              <button type="button" className="focus-close" onClick={requestClose} aria-label="Close and return to the page">
                <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
                  <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* The wheel, top-aligned to the header line */}
            <div
              className="relative mx-auto"
              style={{
                width: WHEEL_BOX.width * wheelScale,
                height: WHEEL_BOX.height * wheelScale,
                marginTop: wheelTop,
                marginBottom: 24,
              }}
            >
              {wheels.map((wheel) => (
                <div key={wheel.key} className={`absolute inset-0 wheel-${wheel.state}`} data-dir={wheel.dir}>
                  <div
                    className="origin-top-left"
                    style={{
                      width: WHEEL_BOX.width,
                      height: WHEEL_BOX.height,
                      transform: `scale(${wheelScale})`,
                    }}
                  >
                    <IndicatorWheel
                      indicator={indicatorsByNumber.get(wheel.number)}
                      onPrev={onPrev}
                      onNext={onNext}
                      hasPrev={Boolean(onPrev)}
                      hasNext={Boolean(onNext)}
                      settleFrom={wheel.dir === 'up' ? -SETTLE_DEG : SETTLE_DEG} // eases clockwise into place going down, back going up
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

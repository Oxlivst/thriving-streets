// SceneStory: one scene told as a single scroll (like the BBC's scrollytelling pages).
//
// The scene's block is tall; inside it a full-height stage holds still (sticky) while the
// page scrolls through it, and the scroll position drives what happens on the stage:
//   1. Coming in, the scene sits in the middle of the page, as before.
//   2. Over the next ENTER_PX of scroll the scene slides aside (left, and smaller) and the
//      wheel eases in beside it (below it, on narrow screens). Scroll-linked, so scrolling
//      back up runs it in reverse.
//   3. Then each indicator owns STEP_PX of scroll: the one whose step is current is
//      selected, and the wheel crossfades to it.
//   4. After the last indicator the stage scrolls away with the rest of the page.
// There is no separate mode to open or close: it's all just the page scrolling.
// Clicking an illustration, or the wheel's arrows, scrolls the page to that indicator.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { SCENE_BOX } from '../config/scenes.js';
import Scene from './Scene.jsx';
import IndicatorWheel, { RING_RADIUS } from './IndicatorWheel.jsx';
import WheelHelp from './WheelHelp.jsx';
import useWidth from '../hooks/useWidth.js';
import useNarrow from '../hooks/useNarrow.js';

// Vertical layout, in px from the top of the window (the nav is 60px tall): the scene
// title and the ? sit on HEADER_CENTRE_Y, and the wheel's ring starts on that line.
const NAV_HEIGHT = 60;
const HEADER_CENTRE_Y = 125;
const HEADER_HEIGHT = 48;
const TITLE_TOP = HEADER_CENTRE_Y - 13.5; // scene title (27px line) centred on the row

const ENTER_PX = 800; // scroll over which the scene moves aside and the wheel comes in
const STEP_PX = 700; // scroll per indicator
// Each indicator (and the start of the move aside) is also a scroll-snap stop that a swipe
// can't fly past (main.css, .story-snap), so one swipe moves one indicator on.
const GRID_MAX = 1200; // the two halves together (as in the old focus view)
const GRID_GUTTER = 24;
const GRID_PAD = 32;
const SCENE_FIT = 0.8; // beside the wheel, the scene is 80% of its half
const WHEEL_BOX = { width: 600, height: 700 }; // IndicatorWheel's own coordinate box (centre at 300, 300)
const WHEEL_DRAWN_HEIGHT = 640; // ring top to the bottom of a third factor band, at scale 1
const STACK_GAP = 32; // narrow screens: space between the nav and the scene's title
const SETTLE_DEG = 14; // a new wheel eases this far into place (a hint that it turns)
const FADE_MS = 600; // wheel crossfade

// Where the browser supports scroll-driven animations, the move aside runs on its own
// scroll timeline (main.css, .story-scene / .story-wheel), off the main thread, so it
// stays smooth on phones. Elsewhere the scroll handler below writes it each frame.
const SCROLL_TIMELINE = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: --story');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // ease in and out

const SceneStory = forwardRef(function SceneStory(
  { scene, eager, indicatorsByNumber, selected, hovered, onHover, onActive, onStep, canStep },
  ref,
) {
  const indicators = scene.slots.map((slot) => slot.indicator).sort((a, b) => a - b);
  const narrow = useNarrow();
  const block = useRef(null);
  const sceneEl = useRef(null);
  const wheelEl = useRef(null);
  const [measureStage, stageW, stageH] = useWidth();

  // ----- Layout: where the scene starts (middle of the page) and ends up (beside the wheel)
  const fromW = Math.min(SCENE_BOX.width, stageW - 48, Math.max(455, stageW * 0.4444)); // as on the page
  const fromScale = fromW / SCENE_BOX.width;
  const fromLeft = (stageW - fromW) / 2;
  let layout;
  if (!narrow) {
    const gridW = Math.min(stageW, GRID_MAX + 2 * GRID_PAD);
    const colW = (gridW - 2 * GRID_PAD - 5 * GRID_GUTTER) / 6;
    const halfW = 3 * colW + 2 * GRID_GUTTER;
    const sceneColLeft = (stageW - gridW) / 2 + GRID_PAD;
    const toW = Math.min(SCENE_BOX.width, halfW * SCENE_FIT);
    const headerLine = HEADER_CENTRE_Y;
    const wheelScale = Math.min(1, halfW / WHEEL_BOX.width, (stageH - headerLine - 16) / WHEEL_DRAWN_HEIGHT);
    layout = {
      sceneTop: TITLE_TOP,
      toLeft: sceneColLeft + (halfW - toW) / 2,
      toW,
      wheelLeft: sceneColLeft + halfW + GRID_GUTTER,
      wheelW: halfW,
      headerLine,
      wheelScale,
    };
  } else {
    const wheelW = Math.min(WHEEL_BOX.width, stageW - 2 * GRID_PAD);
    const toScale = Math.min(
      wheelW / SCENE_BOX.width,
      Math.max(0.25, ((stageH - NAV_HEIGHT) * 0.46 - 72 - STACK_GAP) / SCENE_BOX.height),
    );
    const toW = SCENE_BOX.width * toScale;
    const stackHeight = STACK_GAP + 48 + 24 + SCENE_BOX.height * toScale; // gap, title (2 lines), gap, art
    const headerLine = NAV_HEIGHT + stackHeight + 8 + HEADER_HEIGHT / 2;
    layout = {
      sceneTop: NAV_HEIGHT + STACK_GAP,
      toLeft: (stageW - toW) / 2,
      toW,
      wheelLeft: (stageW - wheelW) / 2,
      wheelW,
      headerLine,
      wheelScale: Math.min(1, wheelW / WHEEL_BOX.width, (stageH - headerLine - 16) / WHEEL_DRAWN_HEIGHT),
    };
  }
  const wheelScale = Math.max(0.1, layout.wheelScale);
  const wheelTop = layout.headerLine + RING_RADIUS * wheelScale - (WHEEL_BOX.height / 2 - 50) * wheelScale;
  const blockHeight = stageH + ENTER_PX + indicators.length * STEP_PX;

  // Scroll position (page y) at which each indicator is the current one.
  const stepAt = useCallback(
    (number) => {
      const i = indicators.indexOf(number);
      const top = block.current.getBoundingClientRect().top + window.scrollY;
      return top + ENTER_PX + Math.max(0, i) * STEP_PX;
    },
    [indicators],
  );
  useImperativeHandle(ref, () => ({ indicators, scrollTo: (n) => window.scrollTo({ top: stepAt(n), behavior: 'smooth' }) }), [
    indicators,
    stepAt,
  ]);

  // ----- Scroll drives the stage. Per frame this only reads window.scrollY (the block's
  // place on the page is measured when the layout changes, not on every scroll), and
  // React only hears about it when the current indicator changes.
  const [current, setCurrent] = useState(indicators[0]);
  const geometry = useRef(null);
  geometry.current = { layout, fromW, fromLeft, blockHeight, stageH, narrow };
  const blockTop = useRef(0); // the block's top, in page coordinates
  const last = useRef({ t: -1, i: -1, active: undefined });
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  const update = useCallback(() => {
    const g = geometry.current;
    if (!g.stageH) return;
    const y = window.scrollY - blockTop.current; // how far the stage has been held
    // Fallback for browsers without scroll timelines: write the move aside, when it changes.
    if (!SCROLL_TIMELINE) {
      const t = ease(clamp(y / ENTER_PX, 0, 1));
      if (Math.abs(t - last.current.t) > 0.0005) {
        last.current.t = t;
        const { layout: l } = g;
        const s = 1 + t * (l.toW / g.fromW - 1);
        sceneEl.current.style.transform = `translateX(${(t * (l.toLeft - g.fromLeft)).toFixed(2)}px) scale(${s.toFixed(4)})`;
        wheelEl.current.style.opacity = t.toFixed(3);
        wheelEl.current.style.translate = g.narrow ? `0 ${((1 - t) * 32).toFixed(1)}px` : `${((1 - t) * 48).toFixed(1)}px 0`;
        wheelEl.current.style.visibility = t > 0.01 ? 'visible' : 'hidden';
      }
    }
    // The current indicator: the last one whose step is (more than) half reached.
    const i = clamp(Math.floor((y - ENTER_PX) / STEP_PX + 0.5), 0, indicators.length - 1);
    if (i !== last.current.i) {
      last.current.i = i;
      setCurrent(indicators[i]);
    }
    // Selected (scene highlights it) once the wheel is mostly in, until the stage leaves.
    const active = y >= ENTER_PX * 0.6 && y <= g.blockHeight - g.stageH ? indicators[i] : null;
    if (active !== last.current.active) {
      last.current.active = active;
      onActiveRef.current(scene.id, active);
    }
  }, [indicators, scene.id]);
  // Measure the block's place on the page now, and whenever the page's layout changes.
  useLayoutEffect(() => {
    const measure = () => {
      blockTop.current = block.current.getBoundingClientRect().top + window.scrollY;
      last.current.t = -1; // repaint the fallback
      update();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(block.current);
    return () => observer.disconnect();
  }, [update, blockHeight]);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => (frame ||= requestAnimationFrame(() => ((frame = 0), update())));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [update]);

  // Wheels on stage: the current one, plus the previous one while it fades out.
  const [wheels, setWheels] = useState([{ number: current, key: `${current}`, state: 'in', dir: 'down' }]);
  useEffect(() => {
    setWheels((prev) => {
      if (prev.at(-1)?.number === current) return prev;
      const dir = current > prev.at(-1).number ? 'down' : 'up';
      return [
        ...prev.filter((w) => w.state === 'in').map((w) => ({ ...w, state: 'out', dir })),
        { number: current, key: `${current}-${Date.now()}`, state: 'in', dir },
      ];
    });
    const t = setTimeout(() => setWheels((prev) => prev.filter((w) => w.state === 'in')), FADE_MS);
    return () => clearTimeout(t);
  }, [current]);

  const select = useCallback((n) => window.scrollTo({ top: stepAt(n), behavior: 'smooth' }), [stepAt]);

  return (
    <div
      ref={block}
      className="scene-story relative"
      style={{ height: stageH ? blockHeight : '100svh', '--story-enter': `${ENTER_PX}px` }}
    >
      {[0, ...indicators.map((_, i) => ENTER_PX + i * STEP_PX)].map((at) => (
        <span key={at} className="story-snap" style={{ top: at }} aria-hidden="true" />
      ))}
      <div ref={measureStage} className="scene-story__stage sticky top-0 h-svh">
        {stageW > 0 && (
          <>
            {/* The scene: laid out at its page size in the middle, then moved and scaled aside. */}
            <div
              ref={sceneEl}
              className="story-scene absolute origin-top-left will-change-transform"
              style={{
                left: fromLeft,
                top: layout.sceneTop,
                width: fromW,
                '--story-dx': `${(layout.toLeft - fromLeft).toFixed(2)}px`,
                '--story-scale': (layout.toW / fromW).toFixed(4),
              }}
            >
              <Scene
                scene={scene}
                scale={fromScale}
                eager={eager}
                indicatorsByNumber={indicatorsByNumber}
                selected={selected}
                hovered={hovered}
                onHover={onHover}
                onSelect={select}
              />
            </div>

            {/* The wheel and its ?, easing in beside (or below) the scene. */}
            <div
              ref={wheelEl}
              className="story-wheel absolute top-0 h-full"
              style={{
                left: layout.wheelLeft,
                width: layout.wheelW,
                '--story-from': narrow ? '0 32px' : '48px 0',
                ...(SCROLL_TIMELINE ? {} : { opacity: 0, visibility: 'hidden' }),
              }}
            >
              <div
                className="absolute inset-x-0 z-10 flex items-start"
                style={{ top: layout.headerLine - HEADER_HEIGHT / 2, minHeight: HEADER_HEIGHT }}
              >
                <WheelHelp maxWidth={Math.max(160, layout.wheelW - HEADER_HEIGHT - 16)} />
              </div>
              <div
                className="relative mx-auto"
                style={{ width: WHEEL_BOX.width * wheelScale, height: WHEEL_BOX.height * wheelScale, marginTop: wheelTop }}
              >
                {wheels.map((wheel) => (
                  <div key={wheel.key} className={`absolute inset-0 wheel-${wheel.state}`} data-dir={wheel.dir}>
                    <div
                      className="origin-top-left"
                      style={{ width: WHEEL_BOX.width, height: WHEEL_BOX.height, transform: `scale(${wheelScale})` }}
                    >
                      <IndicatorWheel
                        indicator={indicatorsByNumber.get(wheel.number)}
                        onPrev={() => onStep(wheel.number, -1)}
                        onNext={() => onStep(wheel.number, 1)}
                        hasPrev={canStep(wheel.number, -1)}
                        hasNext={canStep(wheel.number, 1)}
                        settleFrom={wheel.dir === 'up' ? -SETTLE_DEG : SETTLE_DEG}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default SceneStory;

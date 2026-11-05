// SceneStory: the homepage's scenes told as a single scroll (like the BBC's scrollytelling
// pages). One stage holds every scene: after a scene's last indicator the next scene takes
// its place while the wheel stays, so the indicators run on without a break.
//
// The scene's block is tall; inside it a full-height stage holds still (sticky) while the
// page scrolls through it, and the scroll position drives what happens on the stage:
//   1. Coming in, the scene sits in the middle of the page, as before.
//   2. Over the next ENTER_PX of scroll the scene slides aside (left, and smaller) and the
//      wheel eases in beside it (below it, on narrow screens). Scroll-linked, so scrolling
//      back up runs it in reverse.
//   3. Then each indicator owns STEP_PX of scroll: the one whose step is current is
//      selected, and the wheel crossfades to it.
//   4. Between two scenes (halfway from one's last indicator to the next's first), the next
//      scene comes up into the scene's place and the last one goes up and out (on narrow,
//      stacked screens it comes up from behind the wheel). Scroll-linked, like the move aside.
//   5. After the last indicator the stage scrolls away with the rest of the page.
// There is no separate mode to open or close: it's all just the page scrolling.
// Clicking an illustration, the ↓ / ↑ above the wheel, or the wheel's arrows, scrolls the
// page to that indicator.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { SCENE_BOX } from '../config/scenes.js';
import Scene from './Scene.jsx';
import IndicatorWheel, { RING_RADIUS } from './IndicatorWheel.jsx';
import WheelHeader from './WheelHeader.jsx';
import useWidth from '../hooks/useWidth.js';
import useNarrow from '../hooks/useNarrow.js';

// Jumps to an indicator glide, unless the visitor asked their device for less motion.
const scrollBehaviour = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

// Vertical layout, in px from the top of the window (the nav is 60px tall): the scene
// title and the row above the wheel (?, indicator bar, ↓ / ↑) sit on HEADER_CENTRE_Y,
// and the wheel's ring starts WHEEL_GAP below that row.
const NAV_HEIGHT = 60;
const HEADER_CENTRE_Y = 125;
const HEADER_HEIGHT = 48;
const WHEEL_GAP = { wide: 40, narrow: 20 };
// Phones show only the ? in that row (no indicator bar), so the wheel moves up level with it.
const PHONE_MAX = 700;
const TITLE_TOP = HEADER_CENTRE_Y - 13.5; // scene title (27px line) centred on the row

// Scroll lengths match the focus view on main (480px per indicator).
const ENTER_PX = 480; // scroll over which the scene moves aside and the wheel comes in
const STEP_PX = 480; // scroll per indicator
// Each indicator (and the start of the move aside) is also a scroll-snap stop that a swipe
// can't fly past (main.css, .story-snap), so one swipe moves one indicator on.
const GRID_MAX = 1200; // the two halves together (as in the old focus view)
const GRID_GUTTER = 24;
const GRID_PAD = 32;
const SCENE_FIT = 0.8; // beside the wheel, the scene is 80% of its half
const WHEEL_BOX = { width: 600, height: 700 }; // IndicatorWheel's own coordinate box (centre at 300, 300)
const WHEEL_DRAWN_HEIGHT = 640; // ring top to the bottom of a third factor band, at scale 1
const STACK_GAP = 20; // narrow screens: space between the nav and the scene's title
// Narrow screens: the drawing and the wheel share the height left after the fixed parts
// (nav, gap, two-line title, gaps, the header row, the gap under it, bottom margin), about 42 : 58.
// On phones the wheel starts level with the ?, so the row and the gap under it take no height.
const stackFixed = (phone) => NAV_HEIGHT + STACK_GAP + 48 + 24 + 8 + (phone ? 0 : HEADER_HEIGHT + WHEEL_GAP.narrow) + 16;
const STACK_ART_SHARE = 0.42;
const SETTLE_DEG = 14; // a new wheel eases this far into place (a hint that it turns)
const FADE_MS = 600; // wheel crossfade
const SWAP_PX = 360; // scroll over which one scene hands over to the next (centred between their steps)

// Where the browser supports scroll-driven animations, the move aside runs on its own
// scroll timeline (main.css, .story-scene / .story-wheel), off the main thread, so it
// stays smooth on phones. Elsewhere the scroll handler below writes it each frame.
const SCROLL_TIMELINE = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: --story');

// While any story holds its stage, the page snaps firmly to its stops (as the focus view
// on main does): html.story-snap-on in main.css. Elsewhere it scrolls freely.
const holding = new Set();
const setHolding = (id, on) => {
  if (on) holding.add(id);
  else holding.delete(id);
  document.documentElement.classList.toggle('story-snap-on', holding.size > 0);
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // ease in and out

const SceneStory = forwardRef(function SceneStory(
  { id, scenes, indicatorsByNumber, selected, hovered, onHover, onActive, onStep, canStep },
  ref,
) {
  // Every scene's indicators in order, and where each scene's first one comes in that order.
  const indicators = scenes.flatMap((scene) => scene.slots.map((slot) => slot.indicator).sort((a, b) => a - b));
  const firstOf = scenes.map((_, k) => scenes.slice(0, k).reduce((n, scene) => n + scene.slots.length, 0));
  // Scroll (from the start of the hold) where scene k (k ≥ 1) takes over: halfway between the
  // last scene's last step and its own first step, over SWAP_PX.
  const swapAt = (k) => ENTER_PX + (firstOf[k] - 0.5) * STEP_PX - SWAP_PX / 2;
  const narrow = useNarrow();
  const block = useRef(null);
  const sceneEls = useRef([]); // each scene's moving element (the move aside)
  const swapEls = useRef([]); // each scene's layer (the handover between scenes)
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
    const ringTop = headerLine + HEADER_HEIGHT / 2 + WHEEL_GAP.wide;
    const wheelScale = Math.min(1, halfW / WHEEL_BOX.width, (stageH - ringTop - 16) / WHEEL_DRAWN_HEIGHT);
    layout = {
      sceneTop: TITLE_TOP,
      toLeft: sceneColLeft + (halfW - toW) / 2,
      toW,
      wheelLeft: sceneColLeft + halfW + GRID_GUTTER,
      wheelW: halfW,
      titleW: halfW,
      headerLine,
      ringTop,
      wheelScale,
    };
  } else {
    // The wheel's box already has room around the ring, so it can run almost edge to edge.
    const wheelW = Math.min(WHEEL_BOX.width, stageW - 16);
    const artMax = Math.min(1, (stageW - 32) / SCENE_BOX.width);
    const wheelMax = Math.min(1, wheelW / WHEEL_BOX.width);
    // Fill the height: split it, then give whatever one can't use (it hit its width) to the other.
    const phone = stageW < PHONE_MAX;
    const room = Math.max(0, stageH - stackFixed(phone));
    let toScale = Math.min(artMax, (room * STACK_ART_SHARE) / SCENE_BOX.height);
    const fitWheel = Math.min(wheelMax, (room - SCENE_BOX.height * toScale) / WHEEL_DRAWN_HEIGHT);
    toScale = Math.max(0.25, Math.min(artMax, (room - WHEEL_DRAWN_HEIGHT * fitWheel) / SCENE_BOX.height));
    const toW = SCENE_BOX.width * toScale;
    const stackHeight = STACK_GAP + 48 + 24 + SCENE_BOX.height * toScale; // gap, title (2 lines), gap, art
    const headerLine = NAV_HEIGHT + stackHeight + 8 + HEADER_HEIGHT / 2;
    const ringTop = phone ? headerLine - HEADER_HEIGHT / 2 : headerLine + HEADER_HEIGHT / 2 + WHEEL_GAP.narrow;
    layout = {
      sceneTop: NAV_HEIGHT + STACK_GAP,
      toLeft: (stageW - toW) / 2,
      toW,
      wheelLeft: (stageW - wheelW) / 2,
      wheelW,
      titleW: wheelW,
      headerLine,
      ringTop,
      wheelScale: Math.min(wheelMax, (stageH - ringTop - 16) / WHEEL_DRAWN_HEIGHT),
    };
  }
  const wheelScale = Math.max(0.1, layout.wheelScale);
  const wheelTop = layout.ringTop + RING_RADIUS * wheelScale - (WHEEL_BOX.height / 2 - 50) * wheelScale;
  const blockHeight = stageH + ENTER_PX + indicators.length * STEP_PX;
  // Handover: how far the next scene comes up from, and the last one goes up to (px).
  const sceneH = (layout.toW * SCENE_BOX.height) / SCENE_BOX.width;
  const swapFrom = narrow ? sceneH * 0.6 : stageH * 0.6;
  const swapTo = narrow ? -sceneH * 0.35 : -stageH * 0.25;

  // Scroll position (page y) at which each indicator is the current one.
  const stepAt = useCallback(
    (number) => {
      const i = indicators.indexOf(number);
      const top = block.current.getBoundingClientRect().top + window.scrollY;
      return top + ENTER_PX + Math.max(0, i) * STEP_PX;
    },
    [indicators],
  );
  // scrollTo(n, { focus }): focus: move keyboard focus to n's wheel once it's showing (the
  // wheel's previous / next keys and arrows, whose own wheel goes away).
  const pendingFocus = useRef(null);
  useImperativeHandle(
    ref,
    () => ({
      indicators,
      scrollTo: (n, { focus = false } = {}) => {
        if (focus) pendingFocus.current = n;
        window.scrollTo({ top: stepAt(n), behavior: scrollBehaviour() });
      },
    }),
    [indicators, stepAt],
  );

  // ----- Scroll drives the stage. Per frame this only reads window.scrollY (the block's
  // place on the page is measured when the layout changes, not on every scroll), and
  // React only hears about it when the current indicator changes.
  const [current, setCurrent] = useState(indicators[0]);
  const [active, setActive] = useState(null); // the current indicator while its wheel shows
  const geometry = useRef(null);
  geometry.current = { layout, fromW, fromLeft, blockHeight, stageH, narrow, swapFrom, swapTo };
  const blockTop = useRef(0); // the block's top, in page coordinates
  const last = useRef({ t: -1, i: -1, active: undefined, held: false });
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  const update = useCallback(() => {
    const g = geometry.current;
    if (!g.stageH) return;
    const y = window.scrollY - blockTop.current; // how far the stage has been held
    // Fallback for browsers without scroll timelines: write the move aside and the handovers,
    // when they change.
    if (!SCROLL_TIMELINE) {
      const t = ease(clamp(y / ENTER_PX, 0, 1));
      if (Math.abs(t - last.current.t) > 0.0005) {
        last.current.t = t;
        const { layout: l } = g;
        const s = 1 + t * (l.toW / g.fromW - 1);
        for (const el of sceneEls.current) {
          if (!el) continue;
          el.style.transform = `translateX(${(t * (l.toLeft - g.fromLeft)).toFixed(2)}px) scale(${s.toFixed(4)})`;
          const title = el.querySelector('.scene-title');
          const c = Number(el.style.getPropertyValue('--story-title-scale')) || 1;
          if (title) title.style.scale = String(1 + t * (c - 1));
        }
        wheelEl.current.style.opacity = t.toFixed(3);
        wheelEl.current.style.translate = g.narrow ? `0 ${((1 - t) * 32).toFixed(1)}px` : `${((1 - t) * 48).toFixed(1)}px 0`;
        wheelEl.current.style.visibility = t > 0.01 ? 'visible' : 'hidden';
      }
      swapEls.current.forEach((el, k) => {
        if (!el) return;
        const comeIn = k === 0 ? 1 : ease(clamp((y - swapAt(k)) / SWAP_PX, 0, 1));
        const goOut = k === swapEls.current.length - 1 ? 0 : ease(clamp((y - swapAt(k + 1)) / SWAP_PX, 0, 1));
        const shown = comeIn * (1 - goOut);
        el.style.opacity = shown.toFixed(3);
        el.style.translate = `0 ${((1 - comeIn) * g.swapFrom + goOut * g.swapTo).toFixed(1)}px`;
        el.style.visibility = shown > 0.01 ? 'visible' : 'hidden';
      });
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
      setActive(active);
      onActiveRef.current(id, active);
    }
    // Firm snapping from where the stage starts to hold until it lets go (its last stop).
    const held = y >= -1 && y < g.blockHeight - g.stageH - 1;
    if (held !== last.current.held) {
      last.current.held = held;
      setHolding(id, held);
    }
    // (swapAt and indicators come from `scenes`, which doesn't change.)
  }, [id]);
  useEffect(() => () => setHolding(id, false), [id]);
  // Measure the block's place on the page now, and whenever the page's layout changes.
  // Also size the scene title: the whole scene shrinks as it moves aside, so the title
  // is counter-scaled to end at the size the focus view on main gives it (18px easing to
  // 16px with the scene's width), no wider than the column it ends up in.
  useLayoutEffect(() => {
    const measure = () => {
      blockTop.current = block.current.getBoundingClientRect().top + window.scrollY;
      const g = geometry.current;
      for (const art of sceneEls.current) {
        const title = art?.querySelector('.scene-title');
        if (!title || !g.stageH) continue;
        const shrink = g.layout.toW / g.fromW; // the scene's scale once aside
        const startFont = parseFloat(getComputedStyle(title).fontSize);
        const endFont = clamp(0.036 * g.layout.toW, 16, startFont);
        const counter = endFont / (startFont * shrink);
        art.style.setProperty('--story-title-scale', counter.toFixed(4));
        art.style.setProperty('--story-title-max', `${(g.layout.titleW / (shrink * counter)).toFixed(1)}px`);
      }
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

  // Keyboard focus follows the wheel: when the indicator changes while focus is in the
  // outgoing wheel (it's about to go), or a jump asked for it, focus moves to the new wheel.
  // Screen readers then read its name ("…, indicator wheel").
  useEffect(() => {
    const stage = wheelEl.current;
    const group = stage?.querySelector('.wheel-in [aria-roledescription]');
    if (!group || active === null) return;
    const leaving = stage.querySelector('.wheel-out')?.contains(document.activeElement);
    const asked = pendingFocus.current !== null && pendingFocus.current === active;
    if (leaving || asked) {
      pendingFocus.current = null;
      group.focus({ preventScroll: true });
    }
  }, [wheels, active]);

  // Screen readers: say which indicator is showing when it changes (from scrolling too).
  const announcement = active !== null ? `Showing: ${indicatorsByNumber.get(active).text}` : '';

  const select = useCallback((n) => window.scrollTo({ top: stepAt(n), behavior: scrollBehaviour() }), [stepAt]);

  return (
    <div
      ref={block}
      // overflow-x-clip: the wheel waits partly off the right edge before it slides in; clip
      // (not hidden) so the sticky stage still sticks.
      className="scene-story relative overflow-x-clip"
      style={{ height: stageH ? blockHeight : '100lvh', '--story-enter': `${ENTER_PX}px` }}
    >
      {/* Stops: the start of the hold, each indicator (across every scene), and where the stage lets go. */}
      {[0, ...indicators.map((_, i) => ENTER_PX + i * STEP_PX), ENTER_PX + indicators.length * STEP_PX].map((at) => (
        <span key={at} className="story-snap" style={{ top: at }} aria-hidden="true" />
      ))}
      {/* The stage is as tall as the screen with the browser's toolbars hidden (lvh), as they
          usually are while scrolling down; when they show, they cover its bottom edge. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div ref={measureStage} className="scene-story__stage sticky top-0 h-lvh">
        {stageW > 0 && (
          <>
            {/* The scenes, one layer each: laid out at the page size in the middle, then moved
                and scaled aside; between scenes, one layer hands over to the next. */}
            {scenes.map((scene, k) => {
              const last = k === scenes.length - 1;
              // Scroll-timeline handover: come in (all but the first), go out (all but the last).
              // "Go out" only fills forwards, so before its range the "come in" end state shows.
              const handover = [
                k > 0 && { name: 'story-swap-in', range: swapAt(k), fill: 'both' },
                !last && { name: 'story-swap-out', range: swapAt(k + 1), fill: 'forwards' },
              ].filter(Boolean);
              // Narrow, stacked screens: a scene coming in rises from behind the wheel, so it's
              // masked at the top of the wheel's row (the mask holds still while the scene moves).
              const fromBehind = narrow && k > 0;
              return (
                <div
                  key={scene.id}
                  className="pointer-events-none absolute inset-0"
                  style={
                    fromBehind
                      ? { clipPath: `inset(0 0 ${(stageH - (layout.headerLine - HEADER_HEIGHT / 2)).toFixed(1)}px 0)` }
                      : undefined
                  }
                >
                  <div
                    ref={(el) => (swapEls.current[k] = el)}
                    className="story-swap pointer-events-none absolute inset-0"
                    style={{
                      '--swap-from': `${swapFrom.toFixed(1)}px`,
                      '--swap-to': `${swapTo.toFixed(1)}px`,
                      ...(SCROLL_TIMELINE && handover.length
                        ? {
                            animationName: handover.map((h) => h.name).join(', '),
                            animationRange: handover.map((h) => `contain ${h.range}px contain ${h.range + SWAP_PX}px`).join(', '),
                            animationFillMode: handover.map((h) => h.fill).join(', '),
                          }
                        : {}),
                      ...(!SCROLL_TIMELINE && k > 0 ? { opacity: 0, visibility: 'hidden' } : {}),
                    }}
                  >
                    <div
                      ref={(el) => (sceneEls.current[k] = el)}
                      className="story-scene pointer-events-auto absolute origin-top-left will-change-transform"
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
                        eager={k === 0}
                        indicatorsByNumber={indicatorsByNumber}
                        selected={selected}
                        hovered={hovered}
                        onHover={onHover}
                        onSelect={select}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

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
              {/* The ?, the indicator's number and ↓ / ↑ (one indicator at a time, like scrolling). */}
              <div className="absolute inset-x-0 z-10" style={{ top: layout.headerLine - HEADER_HEIGHT / 2 }}>
                <WheelHeader
                  number={current}
                  total={indicatorsByNumber.size}
                  width={layout.wheelW}
                  onPrev={() => onStep(current, -1, { focus: false })}
                  onNext={() => onStep(current, 1, { focus: false })}
                  hasPrev={canStep(current, -1)}
                  hasNext={canStep(current, 1)}
                />
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

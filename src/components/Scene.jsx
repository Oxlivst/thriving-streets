// Scene (spec §7.1, INT-02/03/04/07)
//
// One fixed composition of 5 indicator illustrations, drawn at `scale`
// (1 on the page, 0.875 in the focus view).
//
// Hover areas cover each illustration's whole rectangle. Where rectangles
// overlap, the illustration actually drawn under the pointer wins; in empty
// overlapping space, the one on top wins. Switching between illustrations
// waits briefly so passing over an overlap doesn't flicker.
// Each slot is still a real <button> for keyboard and screen-reader users.

import { memo, useEffect, useId, useRef, useState } from 'react';
import { SCENE_BOX } from '../config/scenes.js';

const ALPHA_THRESHOLD = 24;
const SWITCH_DELAY_MS = 120; // moving from one illustration to another
const LEAVE_DELAY_MS = 180; // moving off all illustrations
const SELECTED_HALO_OPACITY = 0.5; // halo behind the selected illustration in the focus view (0 = off)
const HALO_SIZE = 0.75; // halo size relative to the positions in scenes.js (1 = as designed)
const TITLE_SHOW_AT = 0.67; // share of the illustrations on screen before the scene description appears
const PARALLAX_PX = 24; // largest scroll drift of an illustration (depth ±1), page scenes only
const LABEL_DELAY_MS = 500; // hover time before the indicator text appears
const LABEL_OVERLAP = 48; // how far the label tucks up into the illustration, in scene px
const LABEL_WIDTH = 300; // max label width at 1:1, in px (matches .hover-label in main.css)
const LABEL_HINT = 'Click to see the themes behind it';

// Hand-drawn, slightly uneven pill behind hover labels (stretched to fit the text).
const LABEL_BLOB =
  'M16 9C58 3 112 7 166 5C214 3 252 1 284 6C295 8 297 17 291 22C298 27 300 41 296 51C292 62 271 64 240 63' +
  'C190 62 150 68 100 66C70 65 40 68 18 64C6 62 2 52 4 42C0 34 2 24 6 18C7 12 10 10 16 9Z';

// Indicator text under an illustration. Text keeps its size at any scene scale.
// While visible, the label holds the hover for its illustration, so the pointer can rest on it.
function HoverLabel({ slot, text, hint, chevron = false, visible, scale }) {
  // The label keeps its on-screen size at any scene scale (counter-scaled), but never gets
  // wider than the scene on screen; it is kept inside the scene using its real half-width.
  const labelWidth = Math.min(LABEL_WIDTH, SCENE_BOX.width * scale); // px on screen
  const half = labelWidth / 2 / scale; // in scene units
  const centreX = Math.min(Math.max(slot.x + slot.width / 2, half), SCENE_BOX.width - half);
  return (
    <div
      className="hover-label"
      aria-hidden="true"
      data-visible={visible}
      data-indicator={slot.indicator}
      style={{
        left: centreX,
        top: slot.y + slot.height - LABEL_OVERLAP,
        translate: `0 var(--parallax-${slot.indicator}, 0px)`,
        '--label-scale': 1 / scale,
        maxWidth: labelWidth,
      }}
    >
      <svg viewBox="0 0 300 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={LABEL_BLOB} fill="var(--color-bg-alt)" />
      </svg>
      <p className="relative inline-flex items-center justify-center gap-1">
        {text}
        {chevron && (
          <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
            <path d="M4.5 2.5L8 6L4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </p>
      {hint && <p className="hover-label__hint">{hint}</p>}
    </div>
  );
}

// Point-in-polygon (ray casting), for priority hover areas.
function inPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Draws each illustration to an offscreen canvas once, for pixel hit tests. The map is
// made from the colour <img> when it has loaded (so a lazily loaded scene costs nothing
// until it is near the screen); until then the slot's rectangle is used.
function useHitMaps() {
  const maps = useRef(new Map());
  const fromImage = (slot, img) => {
    if (maps.current.has(slot.indicator)) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(slot.width);
    canvas.height = Math.round(slot.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      maps.current.set(slot.indicator, ctx.getImageData(0, 0, canvas.width, canvas.height));
    } catch {
      maps.current.set(slot.indicator, null); // rectangle-only hit testing
    }
  };
  return [maps, fromImage];
}

function useInView(ref, threshold) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= threshold), {
      threshold: [0, threshold],
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

// Scroll parallax: each illustration drifts by up to PARALLAX_PX × its depth as the
// scene crosses the viewport. Offsets go into CSS variables (no re-render per frame)
// and into `offsets` so hit testing follows what's on screen.
function useParallax(boxRef, slots, enabled) {
  const offsets = useRef(new Map());
  useEffect(() => {
    const box = boxRef.current;
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = box.getBoundingClientRect();
      // -1 when the scene's centre is at the bottom of the viewport, +1 at the top.
      const progress = Math.max(-1.5, Math.min(1.5, (innerHeight / 2 - (rect.top + rect.height / 2)) / innerHeight));
      for (const slot of slots) {
        const y = -(slot.depth ?? 0) * PARALLAX_PX * progress;
        offsets.current.set(slot.indicator, y);
        box.style.setProperty(`--parallax-${slot.indicator}`, `${y.toFixed(2)}px`);
      }
    };
    const onScroll = () => (frame ||= requestAnimationFrame(update));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [boxRef, slots, enabled]);
  return offsets;
}

function Scene({
  scene,
  scale = 1,
  parallax = false,
  eager = false, // load the illustrations straight away (the first scene); others load as they near the screen
  indicatorsByNumber,
  selected,
  hovered,
  onHover,
  onSelect,
  onDismiss,
}) {
  const boxRef = useRef(null);
  const hintId = `${useId()}-hint`;
  const [hitMaps, buildHitMap] = useHitMaps();
  const titleVisible = useInView(boxRef, TITLE_SHOW_AT);
  const parallaxOffsets = useParallax(boxRef, scene.slots, parallax);
  const offsetOf = (n) => parallaxOffsets.current.get(n) ?? 0;

  // Which illustration is under the pointer, or null.
  // Order of precedence: a slot's priorityArea → drawn pixels (topmost first) → rectangles (topmost first).
  const hitTest = (event) => {
    const label = event.target.closest?.('.hover-label[data-visible="true"]');
    if (label) return Number(label.dataset.indicator); // pointer resting on a visible label
    const rect = boxRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const priority = [...scene.slots]
      .reverse()
      .find((s) => s.priorityArea && inPolygon(x, y - offsetOf(s.indicator), s.priorityArea));
    if (priority) return priority.indicator;
    let topmostRect = null;
    for (const slot of [...scene.slots].reverse()) {
      const lx = x - slot.x;
      const ly = y - slot.y - offsetOf(slot.indicator);
      if (lx < 0 || ly < 0 || lx >= slot.width || ly >= slot.height) continue;
      topmostRect ??= slot.indicator;
      const map = hitMaps.current.get(slot.indicator);
      if (map && map.data[(Math.floor(ly) * map.width + Math.floor(lx)) * 4 + 3] > ALPHA_THRESHOLD) {
        return slot.indicator; // drawn pixels win
      }
    }
    return topmostRect;
  };

  // Hover changes go through a short delay, except the first one.
  const pending = useRef({ target: undefined, timer: 0 });
  useEffect(() => () => clearTimeout(pending.current.timer), []);
  const requestHover = (target) => {
    const p = pending.current;
    if (target === hovered) {
      clearTimeout(p.timer);
      p.target = undefined;
      return;
    }
    if (target === p.target) return;
    clearTimeout(p.timer);
    p.target = target;
    const delay = hovered === null ? 0 : target === null ? LEAVE_DELAY_MS : SWITCH_DELAY_MS;
    const apply = () => {
      p.target = undefined;
      onHover(target);
    };
    if (delay) p.timer = setTimeout(apply, delay);
    else apply();
  };

  const inScene = (n) => scene.slots.some((s) => s.indicator === n);
  const hoveredHere = inScene(hovered) ? hovered : null;
  const selectedHere = inScene(selected) ? selected : null;
  const anyActive = hoveredHere !== null || selected !== null;

  // The hover label appears once the pointer has rested on an illustration for LABEL_DELAY_MS.
  const [labelFor, setLabelFor] = useState(null);
  useEffect(() => {
    setLabelFor(null);
    if (hoveredHere === null) return;
    const t = setTimeout(() => setLabelFor(hoveredHere), LABEL_DELAY_MS);
    return () => clearTimeout(t);
  }, [hoveredHere]);

  // Esc hides the label until the hover moves to another illustration.
  useEffect(() => {
    if (labelFor === null) return;
    const onKey = (e) => e.key === 'Escape' && setLabelFor(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [labelFor]);

  // The halo keeps its last position while fading out, so it never slides while invisible.
  const lastSelected = useRef(null);
  if (selectedHere !== null) lastSelected.current = selectedHere;

  const haloStyle = (number) => {
    const slot = scene.slots.find((s) => s.indicator === number);
    if (!slot) return {};
    // Shrink around the halo's own centre, so it stays where the design puts it.
    const size = slot.halo.size * HALO_SIZE;
    const inset = (slot.halo.size - size) / 2;
    return { left: slot.halo.x + inset, top: slot.halo.y + inset, width: size, height: size };
  };

  return (
    <div className="scene mx-auto" style={{ width: SCENE_BOX.width * scale }}>
      <h2 className="scene-title scene-fade" style={{ opacity: titleVisible ? 1 : 0 }}>
        {scene.title}
      </h2>
      <span id={hintId} className="sr-only">
        {LABEL_HINT}
      </span>

      <div className="relative mt-6" style={{ width: SCENE_BOX.width * scale, height: SCENE_BOX.height * scale }}>
        <div
          ref={boxRef}
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: SCENE_BOX.width,
            height: SCENE_BOX.height,
            transform: `scale(${scale})`,
            cursor: hoveredHere !== null ? 'pointer' : 'default',
          }}
          onPointerMove={(e) => requestHover(hitTest(e))}
          onPointerLeave={() => requestHover(null)}
          onClick={(e) => {
            const hit = hitTest(e);
            if (hit !== null) onSelect(hit);
            else if (selected !== null) onDismiss?.();
          }}
        >
          {/* The halo sits behind every illustration, only for the selected one (no halo on hover). */}
          <div
            className="scene-halo"
            style={{ ...haloStyle(lastSelected.current), opacity: selectedHere !== null ? SELECTED_HALO_OPACITY : 0 }}
          />

          {scene.slots.map((slot) => {
            const indicator = indicatorsByNumber.get(slot.indicator);
            const inColour = !anyActive || slot.indicator === selected || slot.indicator === hoveredHere;
            return (
              <button
                key={slot.indicator}
                type="button"
                className="scene-slot pointer-events-none"
                data-lifted={slot.indicator === hoveredHere && slot.indicator !== selected}
                data-selected={slot.indicator === selected}
                style={{ left: slot.x, top: slot.y, width: slot.width, height: slot.height, translate: `0 var(--parallax-${slot.indicator}, 0px)` }}
                aria-label={indicator.text}
                aria-describedby={hintId}
                aria-pressed={slot.indicator === selected}
                onFocus={() => onHover(slot.indicator)}
                onBlur={() => onHover(null)}
                onClick={(e) => {
                  // Keyboard activation only: pointer clicks are handled by the scene box.
                  if (e.detail === 0) {
                    e.stopPropagation();
                    onSelect(slot.indicator);
                  }
                }}
              >
                {/* The faded artwork always sits underneath; the full-colour version fades in on top. */}
                <img src={indicator.illustrationFaded} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
                <img
                  src={indicator.illustration}
                  alt=""
                  loading={eager ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ opacity: inColour ? 1 : 0 }}
                  onLoad={(e) => buildHitMap(slot, e.currentTarget)}
                />
              </button>
            );
          })}

          {/* Indicator text under the hovered illustration; "Currently open" under the selected one. */}
          {scene.slots.map((slot) => (
            <HoverLabel
              key={slot.indicator}
              slot={slot}
              // The selected illustration's label just says it's open (its text is in the wheel).
              text={slot.indicator === selected ? 'Currently open' : indicatorsByNumber.get(slot.indicator).text}
              hint={slot.indicator === selected ? null : LABEL_HINT}
              chevron={slot.indicator === selected}
              visible={labelFor === slot.indicator}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-renders only when its own props change (not on every update of the page or focus view).
export default memo(Scene);

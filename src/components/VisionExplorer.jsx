// VisionExplorer (spec §7.1)
//
// Owns the homepage's one piece of shared state, the selected indicator, so
// the scenes and the wheel always agree.
// - No selection: scenes sit in the page's centre column.
// - Selection: a fixed focus view opens over the page (FocusView). The page
//   behind stops scrolling; the scenes scroll on the left at 560px, and the
//   wheel stays put on the right.

import { useCallback, useMemo, useRef, useState } from 'react';
import data from '../data/indicators.json';
import { scenes } from '../config/scenes.js';
import Scene from './Scene.jsx';
import FocusView, { FOCUS_TITLE_TOP } from './FocusView.jsx';

export default function VisionExplorer() {
  // Illustration paths in the data are relative to the site root; BASE_URL makes them
  // work wherever the site is hosted (e.g. /thriving-streets/ on GitHub Pages).
  const indicatorsByNumber = useMemo(
    () =>
      new Map(
        data.indicators.map((i) => [
          i.number,
          {
            ...i,
            illustration: import.meta.env.BASE_URL + i.illustration,
            illustrationFaded: import.meta.env.BASE_URL + i.illustrationFaded,
          },
        ]),
      ),
    [],
  );
  // Indicators that are placed in a scene, in number order.
  const order = useMemo(() => scenes.flatMap((s) => s.slots.map((slot) => slot.indicator)).sort((a, b) => a - b), []);

  const [selected, setSelected] = useState(null);
  const [startAt, setStartAt] = useState('first');
  const [hovered, setHovered] = useState(null);
  const sceneRefs = useRef(new Map());
  const opener = useRef(null);

  const select = useCallback((number, from = 'first') => {
    setSelected((current) => {
      if (current === null) opener.current = document.activeElement;
      return number;
    });
    setStartAt(from);
    setHovered(null);
  }, []);

  // Leave the focus view with the page scrolled to the scene that was last open.
  const close = useCallback(() => {
    const scene = scenes.find((s) => s.slots.some((slot) => slot.indicator === selected));
    const el = scene && sceneRefs.current.get(scene.id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - FOCUS_TITLE_TOP, behavior: 'instant' });
    setSelected(null);
    setHovered(null);
    opener.current?.focus?.({ preventScroll: true });
  }, [selected]);

  const position = order.indexOf(selected);
  const goTo = (offset) => {
    const next = order[position + offset];
    if (next !== undefined) select(next, offset < 0 ? 'last' : 'first');
  };

  return (
    <>
      <div className="mx-auto flex flex-col gap-[72px]">
        {scenes.map((scene) => (
          <div key={scene.id} id={scene.id} ref={(el) => sceneRefs.current.set(scene.id, el)}>
            <Scene
              scene={scene}
              parallax
              indicatorsByNumber={indicatorsByNumber}
              selected={null}
              hovered={selected === null ? hovered : null}
              onHover={setHovered}
              onSelect={(n) => select(n)}
            />
          </div>
        ))}
      </div>

      {selected !== null && (
        <FocusView
          indicatorsByNumber={indicatorsByNumber}
          selected={selected}
          startAt={startAt}
          hovered={hovered}
          onHover={setHovered}
          onSelect={(n) => select(n)}
          onPrev={position > 0 ? () => goTo(-1) : undefined}
          onNext={position < order.length - 1 ? () => goTo(1) : undefined}
          onClose={close}
        />
      )}
    </>
  );
}

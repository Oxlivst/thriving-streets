// VisionExplorer (spec §7.1)
//
// Owns the homepage's shared state, the selected (current) indicator and the hovered
// one, so the scenes and the wheels always agree.
//
// The whole page is one long scroll: one SceneStory holds every scene. Scrolling moves the
// first scene aside, brings the wheel in and steps through the indicators, handing over from
// one scene to the next as it goes, then carries on down the page. Scrolling back up runs it
// all in reverse.

import { useCallback, useMemo, useRef, useState } from 'react';
import data from '../data/indicators.json';
import { scenes } from '../config/scenes.js';
import SceneStory from './SceneStory.jsx';

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
  // Indicators that are placed in a scene, in the order the page scrolls through them.
  const order = useMemo(() => scenes.flatMap((s) => s.slots.map((slot) => slot.indicator).sort((a, b) => a - b)), []);

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const story = useRef(null); // the SceneStory (to scroll to an indicator)

  // The story says which indicator is current while it holds the stage (or null).
  // The indicator a step is scrolling to: until it arrives, or for a moment at most (if the
  // reader scrolls elsewhere instead).
  const heading = useRef({ number: null, at: 0 });
  const onActive = useCallback((storyId, number) => {
    if (number === heading.current.number) heading.current.number = null;
    setSelected(number);
    setHovered(null);
  }, []);

  // ↓ / ↑ above the wheel, and the wheel's arrows once every theme has been shown: scroll to
  // the previous / next indicator.
  const canStep = useCallback((number, offset) => order[order.indexOf(number) + offset] !== undefined, [order]);
  const onStep = useCallback(
    // focus: move keyboard focus to the new wheel (from the wheel's own keys and arrows, whose
    // wheel goes away; not from the ↓ / ↑ above it, which stay).
    // A press while the page is still scrolling to an earlier step carries on from there.
    (number, offset, { focus = true } = {}) => {
      const recent = performance.now() - heading.current.at < 1500;
      const from = recent && heading.current.number !== null ? heading.current.number : number;
      const next = order[order.indexOf(from) + offset];
      if (next === undefined) return;
      heading.current = { number: next, at: performance.now() };
      story.current?.scrollTo(next, { focus });
    },
    [order],
  );

  return (
    <SceneStory
      ref={story}
      id="vision"
      scenes={scenes}
      indicatorsByNumber={indicatorsByNumber}
      selected={selected}
      hovered={hovered}
      onHover={setHovered}
      onActive={onActive}
      onStep={onStep}
      canStep={canStep}
    />
  );
}
